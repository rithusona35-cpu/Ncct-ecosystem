import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.models import (
    User, UserRole, TraineeProfile, TrainingProgramme,
    Module, ContentItem, Progress, Assessment, AssessmentResult, Certificate, Institution
)
from app.services.certificate_service import (
    check_and_issue_certificate,
    get_course_completion_stats,
    get_course_assessment_status,
    generate_certificate_pdf
)

def get_token(client_instance: TestClient, email: str = "cert.trainee@ncct.edu", password: str = "Password123!"):
    # Register trainee
    reg_resp = client_instance.post("/api/auth/register", json={
        "name": "Kavita Rao",
        "email": email,
        "password": password,
        "role": "TRAINEE"
    })
    # Login
    login_resp = client_instance.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    user_id = login_resp.json()["user"]["id"]

    # Setup profile
    client_instance.post(
        "/api/trainee/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "institution": "Vaikunth Mehta National Institute of Cooperative Management",
            "course_enrolled": "Cooperative Banking & Financial Analytics",
            "education": "M.Com Banking",
            "preferred_language": "English",
            "previous_skills": ["Banking", "Audit"]
        }
    )

    return token, user_id


def test_auto_issue_logic_and_verification(client, db_session):
    token, user_id = get_token(client, email="kavita.rao@ncct.edu")

    # 1. Create an institution if needed and programme with a module and content item
    inst = db_session.query(Institution).first()
    if not inst:
        inst = Institution(name="VAMNICOM Pune", code="VAMNICOM-01", location="Pune")
        db_session.add(inst)
        db_session.commit()
        db_session.refresh(inst)

    programme = TrainingProgramme(
        title="Advanced Cooperative Banking Operations",
        description="Comprehensive course on cooperative financial management.",
        institution_id=inst.id,
        trainer_id=1,
        start_date=datetime.utcnow()
    )
    db_session.add(programme)
    db_session.commit()
    db_session.refresh(programme)

    module = Module(
        programme_id=programme.id,
        title="Module 1: Credit Appraisal and Risk Management",
        order=1
    )
    db_session.add(module)
    db_session.commit()
    db_session.refresh(module)

    content_item = ContentItem(
        module_id=module.id,
        title="Credit Analysis Video Lecture",
        type="video",
        url_or_file_path="https://www.youtube.com/watch?v=sample-video",
        order=1
    )
    db_session.add(content_item)
    db_session.commit()
    db_session.refresh(content_item)

    # 2. Before completion and assessment: Auto-issue should return None
    cert = check_and_issue_certificate(user_id, programme.id, db_session)
    assert cert is None, "Certificate should not be issued before requirements are met"

    # 3. Mark progress as complete (100% completion)
    progress_resp = client.post(
        "/api/lms/progress/mark-complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"content_item_id": content_item.id, "module_id": module.id}
    )
    assert progress_resp.status_code == 200

    # Still no assessment: auto-issue should return None
    cert = check_and_issue_certificate(user_id, programme.id, db_session)
    assert cert is None, "Certificate should not be issued without passing assessment"

    # 4. Create an Assessment for this course and submit passing score
    assessment = Assessment(
        course_id=programme.id,
        title="Comprehensive Evaluation: Cooperative Banking",
        type="practical"
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    result = AssessmentResult(
        trainee_id=user_id,
        assessment_id=assessment.id,
        overall_score=86.5,
        total_marks_earned=86,
        total_marks_possible=100,
        skill_wise_score={"1": {"skill_name": "Banking", "percentage": 86.5}},
        submitted_at=datetime.utcnow()
    )
    db_session.add(result)
    db_session.commit()

    # 5. Now check_and_issue_certificate should succeed!
    cert = check_and_issue_certificate(user_id, programme.id, db_session)
    assert cert is not None
    assert cert.certificate_id.startswith("NCCT-CERT-")
    assert cert.assessment_status == "PASSED"
    assert cert.is_verified is True
    assert "Banking" in cert.title or "Cooperative" in cert.title

    cert_id = cert.certificate_id

    # 6. Test Public Verification Endpoint (No Auth Needed)
    verify_resp = client.get(f"/api/certificates/verify/{cert_id}")
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["is_valid"] is True
    assert v_data["certificate"] is not None
    assert v_data["certificate"]["certificate_id"] == cert_id
    assert v_data["certificate"]["trainee_name"] == "Kavita Rao"
    assert v_data["certificate"]["assessment_status"] == "PASSED"
    assert v_data["certificate"]["is_verified"] is True
    assert "NCCT" in v_data["certificate"]["issued_by"]

    # 7. Test Public Verification with Invalid ID
    invalid_resp = client.get("/api/certificates/verify/NCCT-CERT-INVALID-999999")
    assert invalid_resp.status_code == 200
    assert invalid_resp.json()["is_valid"] is False
    assert invalid_resp.json()["certificate"] is None

    # 8. Test PDF Generation & Download Endpoint
    pdf_resp = client.get(f"/api/certificates/{cert_id}/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000
    assert pdf_resp.content.startswith(b"%PDF-")  # Valid PDF header

    # 9. Test Trainee "My Certificates" Endpoint
    my_certs_resp = client.get(
        "/api/certificates/my-certificates",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert my_certs_resp.status_code == 200
    certs_list = my_certs_resp.json()
    assert len(certs_list) >= 1
    assert any(c["certificate_id"] == cert_id for c in certs_list)


def test_ravi_kumar_existing_certificate_verification(client, db_session):
    """
    Ensure a verified certificate is retrievable through the public endpoint.
    """
    # Create user & certificate in in-memory DB
    user = User(
        name="Ravi Kumar",
        email="ravi.verify@ncct.edu",
        hashed_password="fakehashedpassword",
        role=UserRole.TRAINEE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    cert = Certificate(
        certificate_id="NCCT-CERT-2026-0006",
        certificate_code="NCCT-CERT-2026-0006",
        trainee_id=user.id,
        title="NCCT Certified Cooperative Accounting & Technology Practitioner",
        completion_date=datetime.utcnow(),
        issued_date=datetime.utcnow(),
        assessment_status="PASSED",
        issued_by="National Council for Cooperative Training (NCCT)",
        is_verified=True
    )
    db_session.add(cert)
    db_session.commit()

    verify_resp = client.get(f"/api/certificates/verify/{cert.certificate_id}")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["is_valid"] is True
    assert verify_resp.json()["certificate"]["trainee_name"] == "Ravi Kumar"
    assert verify_resp.json()["certificate"]["certificate_id"] == "NCCT-CERT-2026-0006"
