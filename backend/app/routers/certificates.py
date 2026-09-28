from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Certificate, TrainingProgramme, TraineeProfile
from app.dependencies import get_current_user
from app.schemas import (
    CertificateDetailResponse,
    CertificateVerificationResponse,
    CertificateEligibilityCheckResponse
)
from app.services.certificate_service import (
    check_and_issue_certificate,
    ensure_certificate_pdf_url,
    evaluate_all_for_trainee,
    format_certificate_response,
    generate_certificate_pdf,
    get_course_completion_stats,
    get_course_assessment_status
)

router = APIRouter(prefix="/api/certificates", tags=["Verified Digital Certificates"])


@router.get("/verify/{certificate_id}", response_model=CertificateVerificationResponse)
def verify_certificate(
    certificate_id: str,
    db: Session = Depends(get_db)
):
    """
    Public verification endpoint (no authentication required).
    Verifies authenticity of a digital certificate by ID or code.
    Returns structured certificate details if valid, or an invalid status.
    """
    # Clean up input
    clean_id = certificate_id.strip()

    # Search by certificate_id or certificate_code
    cert = db.query(Certificate).filter(
        (Certificate.certificate_id.ilike(clean_id)) |
        (Certificate.certificate_code.ilike(clean_id))
    ).first()

    # Fallback to numeric ID if provided
    if not cert and clean_id.isdigit():
        cert = db.query(Certificate).filter(Certificate.id == int(clean_id)).first()

    if not cert:
        return CertificateVerificationResponse(
            is_valid=False,
            message=f"Certificate '{clean_id}' was not found in the NCCT National Credential Registry.",
            certificate=None
        )

    if not cert.is_verified:
        return CertificateVerificationResponse(
            is_valid=False,
            message="This certificate record is marked as unverified or revoked by the authority.",
            certificate=None
        )

    cert_data = format_certificate_response(cert, db)
    return CertificateVerificationResponse(
        is_valid=True,
        message="Authentic NCCT Certified Digital Credential. Verification Confirmed.",
        certificate=CertificateDetailResponse(**cert_data)
    )


@router.get("/my-certificates", response_model=List[CertificateDetailResponse])
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all issued certificates for the authenticated trainee.
    Automatically evaluates course completions and assessments to auto-issue
    any eligible certificates before returning.
    """
    # Auto-evaluate any pending completed courses
    certs = evaluate_all_for_trainee(current_user.id, db)

    return [CertificateDetailResponse(**format_certificate_response(c, db)) for c in certs]


@router.get("/{certificate_id}/pdf")
def download_certificate_pdf(
    certificate_id: str,
    redirect: bool = False,
    db: Session = Depends(get_db)
):
    """
    Generates and downloads the high-resolution landscape A4 PDF Certificate.
    If redirect=true is requested, redirects directly to the Cloudinary-hosted PDF URL.
    By default, streams the PDF bytes with Content-Disposition attachment.
    """
    clean_id = certificate_id.strip()
    cert = db.query(Certificate).filter(
        (Certificate.certificate_id.ilike(clean_id)) |
        (Certificate.certificate_code.ilike(clean_id))
    ).first()

    if not cert and clean_id.isdigit():
        cert = db.query(Certificate).filter(Certificate.id == int(clean_id)).first()

    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Certificate '{certificate_id}' not found."
        )

    # Ensure Cloudinary PDF URL is created and stored on the record
    pdf_url = ensure_certificate_pdf_url(cert, db)

    # If redirect=True and Cloudinary URL is available, issue HTTP 302 redirect
    if redirect and pdf_url and pdf_url.startswith("http"):
        return RedirectResponse(url=pdf_url, status_code=status.HTTP_302_FOUND)

    pdf_bytes = generate_certificate_pdf(cert, db)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="NCCT_Certificate_{cert.certificate_id}.pdf"',
            "X-Cloudinary-Url": pdf_url or ""
        }
    )


@router.get("/{certificate_id}", response_model=CertificateDetailResponse)
def get_certificate_by_id(
    certificate_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves certificate details by Certificate ID.
    """
    clean_id = certificate_id.strip()
    cert = db.query(Certificate).filter(
        (Certificate.certificate_id.ilike(clean_id)) |
        (Certificate.certificate_code.ilike(clean_id))
    ).first()

    if not cert and clean_id.isdigit():
        cert = db.query(Certificate).filter(Certificate.id == int(clean_id)).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    return CertificateDetailResponse(**format_certificate_response(cert, db))


@router.post("/check-eligibility/{course_id}", response_model=CertificateEligibilityCheckResponse)
def check_course_eligibility(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Checks if trainee has reached 100% course completion AND passed assessment (>= 60%),
    and auto-issues the certificate if eligible.
    """
    programme = db.query(TrainingProgramme).filter(TrainingProgramme.id == course_id).first()
    if not programme:
        raise HTTPException(status_code=404, detail="Course programme not found")

    completion_stats = get_course_completion_stats(current_user.id, course_id, db)
    assessment_stats = get_course_assessment_status(current_user.id, course_id, db, score_threshold=60.0)

    is_eligible = completion_stats["is_100_percent"] and assessment_stats["passed"]

    cert = None
    if is_eligible:
        cert = check_and_issue_certificate(current_user.id, course_id, db, score_threshold=60.0)

    existing_cert = db.query(Certificate).filter(
        Certificate.trainee_id == current_user.id,
        (Certificate.course_id == course_id) | (Certificate.programme_id == course_id)
    ).first()

    cert_id = existing_cert.certificate_id if existing_cert else None

    if is_eligible:
        msg = "Congratulations! You have satisfied all completion and assessment criteria. Your certificate is verified and issued."
    elif not completion_stats["is_100_percent"] and not assessment_stats["passed"]:
        msg = f"Incomplete: Course progress is {completion_stats['percentage']}% (need 100%) and assessment is not yet passed."
    elif not completion_stats["is_100_percent"]:
        msg = f"Course progress is {completion_stats['percentage']}%. Complete all modules to unlock your certificate."
    else:
        msg = "Course content completed, but final assessment score must be at least 60% to qualify."

    return CertificateEligibilityCheckResponse(
        eligible=is_eligible,
        course_id=course_id,
        course_title=programme.title,
        course_completion_pct=completion_stats["percentage"],
        assessment_passed=assessment_stats["passed"],
        assessment_score=assessment_stats["score"],
        certificate_id=cert_id,
        message=msg
    )
