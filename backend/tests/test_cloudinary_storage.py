import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.models import (
    User, UserRole, Institution, TrainingProgramme, Module, ContentItem,
    Progress, Assessment, AssessmentResult, Certificate, TraineeProfile
)
from app.services.storage_service import (
    validate_file_upload, upload_to_cloudinary, upload_certificate_pdf_to_cloudinary,
    MAX_PDF_SIZE_BYTES, MAX_VIDEO_SIZE_BYTES
)
from app.services.certificate_service import check_and_issue_certificate, format_certificate_response
from fastapi import UploadFile, HTTPException


def get_trainer_token(client: TestClient, email: str = "trainer.cloud@ncct.edu", password: str = "Password123!"):
    # Register trainer
    client.post("/api/auth/register", json={
        "name": "Dr. Rajesh Sharma",
        "email": email,
        "password": password,
        "role": "TRAINER"
    })
    # Login
    login_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_resp.status_code == 200
    return login_resp.json()["access_token"]


def test_file_type_and_size_validation():
    # 1. Valid PDF should pass
    pdf_bytes = b"%PDF-1.4 sample pdf content for testing NCCT cooperative learning"
    mock_pdf = UploadFile(filename="module_lecture.pdf", file=io.BytesIO(pdf_bytes))
    mock_pdf.headers = {"content-type": "application/pdf"}
    result_bytes = validate_file_upload(mock_pdf, item_type="pdf")
    assert result_bytes == pdf_bytes

    # 2. Invalid file type for PDF should fail
    bad_pdf = UploadFile(filename="malicious.exe", file=io.BytesIO(b"binary content"))
    bad_pdf.headers = {"content-type": "application/x-msdownload"}
    with pytest.raises(HTTPException) as exc_info:
        validate_file_upload(bad_pdf, item_type="pdf")
    assert exc_info.value.status_code == 400
    assert "Invalid file format for PDF" in exc_info.value.detail

    # 3. Oversized PDF should fail
    oversized_bytes = b"0" * (MAX_PDF_SIZE_BYTES + 1024)
    oversized_pdf = UploadFile(filename="huge.pdf", file=io.BytesIO(oversized_bytes))
    oversized_pdf.headers = {"content-type": "application/pdf"}
    with pytest.raises(HTTPException) as exc_info:
        validate_file_upload(oversized_pdf, item_type="pdf")
    assert exc_info.value.status_code == 400
    assert "exceeds maximum allowed limit" in exc_info.value.detail

    # 4. Valid MP4 should pass
    mp4_bytes = b"fake mp4 video bytes"
    mock_video = UploadFile(filename="lecture.mp4", file=io.BytesIO(mp4_bytes))
    mock_video.headers = {"content-type": "video/mp4"}
    res_video = validate_file_upload(mock_video, item_type="video")
    assert res_video == mp4_bytes

    # 5. Invalid video extension should fail
    bad_video = UploadFile(filename="audio.mp3", file=io.BytesIO(b"audio bytes"))
    bad_video.headers = {"content-type": "audio/mpeg"}
    with pytest.raises(HTTPException) as exc_info:
        validate_file_upload(bad_video, item_type="video")
    assert exc_info.value.status_code == 400
    assert "Invalid video format" in exc_info.value.detail


def test_trainer_upload_content_to_cloudinary(client, db_session):
    trainer_token = get_trainer_token(client, email="trainer.storage@ncct.edu")
    trainer = db_session.query(User).filter(User.email == "trainer.storage@ncct.edu").first()

    # 1. Setup institution and module
    inst = Institution(name="RICM Chandigarh", code="RICM-CHD", location="Chandigarh")
    db_session.add(inst)
    db_session.commit()

    prog = TrainingProgramme(
        title="Cooperative Audit & Financial Compliance",
        description="Comprehensive training in multi-state cooperative audits",
        institution_id=inst.id,
        trainer_id=trainer.id
    )
    db_session.add(prog)
    db_session.commit()

    mod = Module(programme_id=prog.id, title="Module 1: Statutory Framework", order=1)
    db_session.add(mod)
    db_session.commit()

    # 2. Upload test PDF as trainer with mocked Cloudinary uploader
    mock_cloudinary_url = "https://res.cloudinary.com/ncct-prod/raw/upload/v1727500000/ncct/curriculum/modules/test_lecture.pdf"
    
    with patch("cloudinary.uploader.upload") as mock_upload, \
         patch("app.services.storage_service.is_cloudinary_configured", return_value=True):
        mock_upload.return_value = {
            "secure_url": mock_cloudinary_url,
            "public_id": "ncct/curriculum/modules/test_lecture",
            "format": "pdf",
            "bytes": 1024
        }

        test_pdf_file = ("statutory_framework.pdf", b"%PDF-1.4 Test PDF bytes for audit", "application/pdf")
        resp = client.post(
            f"/api/trainer/modules/{mod.id}/upload-content",
            headers={"Authorization": f"Bearer {trainer_token}"},
            data={"title": "Statutory Framework Reading", "type": "pdf", "order": 1},
            files={"file": test_pdf_file}
        )

        assert resp.status_code == 201, f"Upload failed: {resp.text}"
        data = resp.json()
        assert data["url"] == mock_cloudinary_url
        assert data["url_or_file_path"] == mock_cloudinary_url
        assert data["title"] == "Statutory Framework Reading"

        # Verify database record
        item = db_session.query(ContentItem).filter(ContentItem.id == data["id"]).first()
        assert item is not None
        assert item.url == mock_cloudinary_url
        assert item.url_or_file_path == mock_cloudinary_url


def test_certificate_generation_cloudinary_url(client, db_session):
    # Setup trainee and passed course
    trainee = User(
        name="Sunita Deshmukh",
        email="sunita.storage@ncct.edu",
        role=UserRole.TRAINEE,
        hashed_password="fakehashedpassword"
    )
    db_session.add(trainee)
    db_session.commit()

    profile = TraineeProfile(
        user_id=trainee.id,
        trainee_id="NCCT-TR-99881",
        institution="VAMNICOM Pune",
        course_enrolled="Cooperative Management"
    )
    db_session.add(profile)

    inst = db_session.query(Institution).first()
    if not inst:
        inst = Institution(name="VAMNICOM Pune", code="VAMNICOM-01", location="Pune")
        db_session.add(inst)
        db_session.commit()

    prog = TrainingProgramme(
        title="Dairy Cooperatives Operations Management",
        trainer_id=trainee.id,
        institution_id=inst.id
    )
    db_session.add(prog)
    db_session.commit()

    mod = Module(programme_id=prog.id, title="Milk Procurement & Quality Control", order=1)
    db_session.add(mod)
    db_session.commit()

    ci = ContentItem(
        module_id=mod.id,
        type="pdf",
        title="Quality SOPs",
        url_or_file_path="https://res.cloudinary.com/ncct/sop.pdf",
        url="https://res.cloudinary.com/ncct/sop.pdf",
        order=1
    )
    db_session.add(ci)
    db_session.commit()

    # Progress 100%
    prog_rec = Progress(
        trainee_id=trainee.id,
        module_id=mod.id,
        content_item_id=ci.id,
        status="completed"
    )
    db_session.add(prog_rec)

    # Assessment passed
    assess = Assessment(title="Final Evaluation", course_id=prog.id, type="quiz")
    db_session.add(assess)
    db_session.commit()

    res = AssessmentResult(
        trainee_id=trainee.id,
        assessment_id=assess.id,
        overall_score=92
    )
    db_session.add(res)
    db_session.commit()

    # Issue certificate with Cloudinary mock
    mock_cert_cloudinary_url = "https://res.cloudinary.com/ncct-prod/raw/upload/v1727500000/ncct/certificates/NCCT_Certificate_TEST_001.pdf"
    
    with patch("cloudinary.uploader.upload") as mock_upload, \
         patch("app.services.storage_service.is_cloudinary_configured", return_value=True):
        mock_upload.return_value = {
            "secure_url": mock_cert_cloudinary_url,
            "public_id": "ncct/certificates/NCCT_Certificate_TEST_001",
            "format": "pdf"
        }

        cert = check_and_issue_certificate(trainee.id, prog.id, db_session)
        assert cert is not None
        assert cert.pdf_url == mock_cert_cloudinary_url

        # Verify formatted certificate response contains pdf_url
        details = format_certificate_response(cert, db_session)
        assert details["pdf_url"] == mock_cert_cloudinary_url
        assert details["pdf_download_url"] == mock_cert_cloudinary_url

        # Verify GET /api/certificates/{id}/pdf?redirect=true redirects to Cloudinary
        resp = client.get(f"/api/certificates/{cert.certificate_id}/pdf?redirect=true", follow_redirects=False)
        assert resp.status_code == 302
        assert resp.headers["location"] == mock_cert_cloudinary_url

        # Verify default download serves the official PDF binary with Cloudinary header
        download_resp = client.get(f"/api/certificates/{cert.certificate_id}/pdf")
        assert download_resp.status_code == 200
        assert download_resp.headers["content-type"] == "application/pdf"
        assert download_resp.headers["x-cloudinary-url"] == mock_cert_cloudinary_url
        assert len(download_resp.content) > 100
