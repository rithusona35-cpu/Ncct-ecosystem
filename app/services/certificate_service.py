import io
import os
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from sqlalchemy.orm import Session
from sqlalchemy import desc

import qrcode
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader

from app.database import SessionLocal
from app.models import (
    User, TraineeProfile, TrainingProgramme, Module, ContentItem,
    Progress, Assessment, AssessmentResult, Certificate, Institution, Batch
)
from app.services.storage_service import upload_certificate_pdf_to_cloudinary


def generate_unique_certificate_id(db: Session, year: Optional[int] = None) -> str:
    """
    Generates a unique, standardized certificate identifier:
    Format: NCCT-CERT-YYYY-XXXXXX (e.g. NCCT-CERT-2026-000123)
    """
    target_year = year or datetime.utcnow().year
    prefix = f"NCCT-CERT-{target_year}-"

    # Count existing certificates in this year
    count = db.query(Certificate).filter(
        Certificate.certificate_id.like(f"{prefix}%")
    ).count()

    seq = count + 1
    candidate_id = f"{prefix}{seq:06d}"

    # Ensure absolute uniqueness
    while db.query(Certificate).filter(Certificate.certificate_id == candidate_id).first():
        seq += 1
        candidate_id = f"{prefix}{seq:06d}"

    return candidate_id


def get_course_completion_stats(trainee_id: int, course_id: int, db: Session) -> Dict[str, Any]:
    """
    Calculates completion percentage for a trainee in a course.
    """
    modules = db.query(Module).filter(Module.programme_id == course_id).all()
    if not modules:
        return {
            "total_items": 0,
            "completed_items": 0,
            "percentage": 100,
            "is_100_percent": True
        }

    module_ids = [m.id for m in modules]
    content_items = db.query(ContentItem).filter(ContentItem.module_id.in_(module_ids)).all()
    total_items = len(content_items)

    if total_items == 0:
        return {
            "total_items": 0,
            "completed_items": 0,
            "percentage": 100,
            "is_100_percent": True
        }

    content_item_ids = [ci.id for ci in content_items]
    completed_count = db.query(Progress).filter(
        Progress.trainee_id == trainee_id,
        Progress.content_item_id.in_(content_item_ids),
        Progress.status == "completed"
    ).count()

    pct = round((completed_count / total_items) * 100) if total_items > 0 else 100
    return {
        "total_items": total_items,
        "completed_items": completed_count,
        "percentage": min(100, pct),
        "is_100_percent": pct >= 100
    }


def get_course_assessment_status(
    trainee_id: int,
    course_id: int,
    db: Session,
    score_threshold: float = 60.0
) -> Dict[str, Any]:
    """
    Verifies if the trainee has passed the final assessment (score >= threshold)
    for the specified course.
    """
    assessments = db.query(Assessment).filter(Assessment.course_id == course_id).all()
    if assessments:
        assessment_ids = [a.id for a in assessments]
        results = db.query(AssessmentResult).filter(
            AssessmentResult.trainee_id == trainee_id,
            AssessmentResult.assessment_id.in_(assessment_ids)
        ).order_by(desc(AssessmentResult.overall_score)).all()

        if results:
            best_score = results[0].overall_score
            passed = best_score >= score_threshold
            return {
                "has_assessment": True,
                "passed": passed,
                "score": best_score,
                "status": "PASSED" if passed else "FAILED"
            }

    # Fallback: check general assessment results for this trainee
    general_results = db.query(AssessmentResult).filter(
        AssessmentResult.trainee_id == trainee_id
    ).order_by(desc(AssessmentResult.overall_score)).all()

    if general_results:
        best_score = general_results[0].overall_score
        passed = best_score >= score_threshold
        return {
            "has_assessment": True,
            "passed": passed,
            "score": best_score,
            "status": "PASSED" if passed else "FAILED"
        }

    return {
        "has_assessment": False,
        "passed": False,
        "score": None,
        "status": "NOT_ATTEMPTED"
    }


def check_and_issue_certificate(
    trainee_id: int,
    course_id: int,
    db: Session,
    score_threshold: float = 60.0
) -> Optional[Certificate]:
    """
    Auto-issue logic: when a trainee reaches 100% course completion AND passes
    the final assessment (score >= threshold), auto-generate a Certificate record.
    """
    # 1. Check if certificate already exists
    existing = db.query(Certificate).filter(
        Certificate.trainee_id == trainee_id,
        (Certificate.course_id == course_id) | (Certificate.programme_id == course_id)
    ).first()

    if existing:
        return existing

    # 2. Check course completion
    completion_stats = get_course_completion_stats(trainee_id, course_id, db)
    assessment_stats = get_course_assessment_status(trainee_id, course_id, db, score_threshold)

    # Must be 100% complete and passed
    if not (completion_stats["is_100_percent"] and assessment_stats["passed"]):
        return None

    # 3. Retrieve user, profile, and course details
    user = db.query(User).filter(User.id == trainee_id).first()
    if not user:
        return None

    programme = db.query(TrainingProgramme).filter(TrainingProgramme.id == course_id).first()
    programme_title = programme.title if programme else "Cooperative Accounting & Technology"

    institution_id = programme.institution_id if (programme and programme.institution_id) else None

    # Generate unique ID
    cert_id = generate_unique_certificate_id(db)

    cert_title = f"Certificate of Professional Competency in {programme_title}"

    certificate = Certificate(
        certificate_id=cert_id,
        certificate_code=cert_id,
        trainee_id=trainee_id,
        course_id=course_id,
        programme_id=course_id,
        institution_id=institution_id,
        title=cert_title,
        completion_date=datetime.utcnow(),
        issued_date=datetime.utcnow(),
        assessment_status="PASSED",
        issued_by="National Council for Cooperative Training (NCCT)",
        is_verified=True
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)

    # Phase 9: Upload generated PDF to Cloudinary and store that URL in Certificate.pdf_url
    try:
        pdf_bytes = generate_certificate_pdf(certificate, db)
        cloudinary_pdf_url = upload_certificate_pdf_to_cloudinary(pdf_bytes, cert_id)
        certificate.pdf_url = cloudinary_pdf_url
        db.commit()
        db.refresh(certificate)
    except Exception as e:
        import logging
        logging.getLogger("ncct.certificates").error(f"Failed to upload certificate PDF to Cloudinary: {e}")

    return certificate


def ensure_certificate_pdf_url(cert: Certificate, db: Session) -> str:
    """
    Ensures that a Certificate record has its PDF generated and uploaded to Cloudinary.
    """
    if cert.pdf_url:
        return cert.pdf_url

    try:
        pdf_bytes = generate_certificate_pdf(cert, db)
        cert_id = cert.certificate_id or f"NCCT-CERT-{cert.id}"
        cloudinary_url = upload_certificate_pdf_to_cloudinary(pdf_bytes, cert_id)
        cert.pdf_url = cloudinary_url
        db.commit()
        db.refresh(cert)
        return cloudinary_url
    except Exception as e:
        import logging
        logging.getLogger("ncct.certificates").error(f"Error ensuring certificate PDF url: {e}")
        return f"/api/certificates/{cert.certificate_id}/pdf"


def evaluate_all_for_trainee(
    trainee_id: int,
    db: Session,
    score_threshold: float = 60.0
) -> List[Certificate]:
    """
    Evaluates all courses for this trainee and automatically issues certificates
    for all completed and passed courses.
    """
    programmes = db.query(TrainingProgramme).all()
    for prog in programmes:
        check_and_issue_certificate(trainee_id, prog.id, db, score_threshold)

    # Fetch all certificates for trainee
    return db.query(Certificate).filter(
        Certificate.trainee_id == trainee_id
    ).order_by(desc(Certificate.issued_date)).all()


def format_certificate_response(cert: Certificate, db: Session) -> Dict[str, Any]:
    """
    Formats a Certificate model instance into a structured dictionary.
    """
    trainee = db.query(User).filter(User.id == cert.trainee_id).first()
    trainee_name = trainee.name if trainee else "NCCT Trainee"

    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == cert.trainee_id).first()
    trainee_code = profile.trainee_id if profile else f"NCCT-TR-{cert.trainee_id:05d}"
    default_institution = profile.institution if (profile and profile.institution) else "Vaikunth Mehta National Institute of Cooperative Management (VAMNICOM)"

    course_title = "Cooperative Management & Digital Technology"
    if cert.course:
        course_title = cert.course.title
    elif cert.programme:
        course_title = cert.programme.title

    institution_name = default_institution
    if cert.institution:
        institution_name = cert.institution.name
    elif cert.programme and cert.programme.institution:
        institution_name = cert.programme.institution.name

    cert_id = cert.certificate_id or cert.certificate_code or f"NCCT-CERT-{cert.id}"

    return {
        "id": cert.id,
        "certificate_id": cert_id,
        "certificate_code": cert_id,
        "trainee_id": cert.trainee_id,
        "trainee_name": trainee_name,
        "trainee_code": trainee_code,
        "course_id": cert.course_id or cert.programme_id,
        "course_title": course_title,
        "institution_id": cert.institution_id,
        "institution_name": institution_name,
        "title": cert.title,
        "completion_date": cert.completion_date or cert.issued_date,
        "issued_date": cert.issued_date,
        "assessment_status": cert.assessment_status or "PASSED",
        "issued_by": cert.issued_by or "National Council for Cooperative Training (NCCT)",
        "is_verified": bool(cert.is_verified),
        "verification_url": f"/verify/{cert_id}",
        "pdf_download_url": cert.pdf_url or f"/api/certificates/{cert_id}/pdf",
        "pdf_url": cert.pdf_url
    }


def generate_certificate_pdf(cert: Certificate, db: Session, base_verify_url: str = "http://localhost:3000") -> bytes:
    """
    Generates a high-resolution, landscape A4 PDF Certificate with ReportLab,
    including official NCCT styling, security guilloche borders, and an embedded
    verification QR code encoding the verification URL.
    """
    details = format_certificate_response(cert, db)
    cert_id = details["certificate_id"]
    trainee_name = details["trainee_name"]
    course_title = details["course_title"]
    institution_name = details["institution_name"]
    issued_date_str = details["issued_date"].strftime("%B %d, %Y")
    verification_url = f"{base_verify_url.rstrip('/')}/verify/{cert_id}"

    # Generate QR Code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=5,
        border=1,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#1E3A8A", back_color="white")

    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    qr_reader = ImageReader(qr_buffer)

    # Setup Landscape A4 Canvas
    pdf_buffer = io.BytesIO()
    width, height = landscape(A4)  # 841.89 x 595.27 points
    c = canvas.Canvas(pdf_buffer, pagesize=landscape(A4))
    c.setTitle(f"NCCT Certificate - {cert_id}")
    c.setAuthor("National Council for Cooperative Training (NCCT)")
    c.setSubject("Verified Digital Certificate of Competency")

    # Background Tint
    c.setFillColor(colors.HexColor("#FCFCFD"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Outer Double Border (Navy & Gold)
    # Outer navy boundary
    c.setStrokeColor(colors.HexColor("#1E3A8A"))  # Dark Blue
    c.setLineWidth(4)
    c.rect(20, 20, width - 40, height - 40, fill=0, stroke=1)

    # Inner gold border
    c.setStrokeColor(colors.HexColor("#D97706"))  # Warm Gold
    c.setLineWidth(1.5)
    c.rect(28, 28, width - 56, height - 56, fill=0, stroke=1)

    # Corner Decorative Squares
    corner_size = 12
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.rect(25, 25, corner_size, corner_size, fill=1, stroke=0)
    c.rect(width - 25 - corner_size, 25, corner_size, corner_size, fill=1, stroke=0)
    c.rect(25, height - 25 - corner_size, corner_size, corner_size, fill=1, stroke=0)
    c.rect(width - 25 - corner_size, height - 25 - corner_size, corner_size, corner_size, fill=1, stroke=0)

    # Header Emblem / Organisation
    c.setFont("Helvetica-Bold", 19)
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.drawCentredString(width / 2.0, height - 68, "NATIONAL COUNCIL FOR COOPERATIVE TRAINING")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#4B5563"))
    c.drawCentredString(width / 2.0, height - 84, "An Autonomous Society Promoted by Ministry of Cooperation, Government of India")

    # Header Divider Line
    c.setStrokeColor(colors.HexColor("#D97706"))
    c.setLineWidth(1)
    c.line(width / 2.0 - 180, height - 94, width / 2.0 + 180, height - 94)

    # Main Award Title
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(colors.HexColor("#B45309"))
    c.drawCentredString(width / 2.0, height - 134, "CERTIFICATE OF EXCELLENCE & COMPETENCY")

    c.setFont("Helvetica", 11)
    c.setFillColor(colors.HexColor("#6B7280"))
    c.drawCentredString(width / 2.0, height - 158, "THIS DIGITAL CREDENTIAL IS PROUDLY CONFERRED UPON")

    # Trainee Name
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.drawCentredString(width / 2.0, height - 200, trainee_name.upper())

    # Underline accent for trainee name
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1)
    c.line(width / 2.0 - 200, height - 208, width / 2.0 + 200, height - 208)

    # Trainee ID & Statement
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#4B5563"))
    c.drawCentredString(width / 2.0, height - 228, f"Trainee Identifier: {details['trainee_code']}")

    c.setFont("Helvetica", 12)
    c.setFillColor(colors.HexColor("#374151"))
    statement = "for successfully completing the rigorous curriculum, practical training, and competency evaluations in"
    c.drawCentredString(width / 2.0, height - 258, statement)

    # Course / Programme Title
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.drawCentredString(width / 2.0, height - 290, course_title)

    # Institution
    c.setFont("Helvetica-Oblique", 11)
    c.setFillColor(colors.HexColor("#4B5563"))
    c.drawCentredString(width / 2.0, height - 315, f"Conducted at: {institution_name}")

    # Middle Verified Badge Banner
    badge_y = height - 355
    c.setFillColor(colors.HexColor("#ECFDF5"))
    c.roundRect(width / 2.0 - 130, badge_y - 8, 260, 24, 6, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#059669"))
    c.setLineWidth(1)
    c.roundRect(width / 2.0 - 130, badge_y - 8, 260, 24, 6, fill=0, stroke=1)

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#065F46"))
    c.drawCentredString(width / 2.0, badge_y + 1, "✓ OFFICIALLY VERIFIED & SECURE CREDENTIAL")

    # Bottom Grid: Left = Metadata, Center = QR Code, Right = Signatures
    bottom_y = 65

    # 1. Left Column: Details & Verification Code
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#1F2937"))
    c.drawString(60, bottom_y + 60, "CERTIFICATE IDENTIFIER:")
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.drawString(60, bottom_y + 45, cert_id)

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#1F2937"))
    c.drawString(60, bottom_y + 25, "ISSUE DATE:")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#4B5563"))
    c.drawString(135, bottom_y + 25, issued_date_str)

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#1F2937"))
    c.drawString(60, bottom_y + 10, "EVALUATION:")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#059669"))
    c.drawString(145, bottom_y + 10, f"{details['assessment_status']} (Passed)")

    # 2. Center Column: QR Code & Verification URL
    qr_x = (width / 2.0) - 45
    qr_y = bottom_y - 5
    c.drawImage(qr_reader, qr_x, qr_y, width=90, height=90)

    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.drawCentredString(width / 2.0, bottom_y - 16, "SCAN TO VERIFY AUTHENTICITY")

    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#6B7280"))
    display_url = f"ncct.gov.in/verify/{cert_id}"
    c.drawCentredString(width / 2.0, bottom_y - 26, display_url)

    # 3. Right Column: Authorised Signatures
    right_x = width - 230
    c.setStrokeColor(colors.HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.line(right_x, bottom_y + 40, right_x + 170, bottom_y + 40)
    c.line(right_x, bottom_y - 5, right_x + 170, bottom_y - 5)

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.drawString(right_x, bottom_y + 26, "Director General")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(right_x, bottom_y + 14, "NCCT Examination Authority")

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#1E3A8A"))
    c.drawString(right_x, bottom_y - 19, "Controller of Examinations")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(right_x, bottom_y - 29, "Academic Standards Board")

    # Security Hash Stamp (Footer Note)
    security_hash = hashlib.sha256(f"{cert_id}:{trainee_name}:{course_title}".encode()).hexdigest()[:16].upper()
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#9CA3AF"))
    c.drawCentredString(width / 2.0, 32, f"Cryptographic Verification Stamp: {security_hash} • NCCT Digital Credential Registry")

    c.showPage()
    c.save()

    return pdf_buffer.getvalue()
