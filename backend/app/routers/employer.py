from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import (
    User, UserRole, JobRole, JobPosting, EmployerCandidateContact,
    JobRoleSkillRequirement, EmploymentRecord, EmployerFeedback, FeedbackRating, Skill, TraineeProfile
)
from app.dependencies import get_current_user, require_role
from app.schemas import (
    JobPostingCreate,
    JobPostingUpdate,
    JobPostingResponse,
    JobRoleSkillRequirementResponse,
    JobMatchesResponse,
    CandidateMatch,
    CandidateMatchItem,
    PublicSkillPassportResponse,
    ContactCandidateRequest,
    ContactCandidateResponse,
    EmploymentRecordCreate,
    EmploymentRecordResponse,
    SkillFeedbackItem,
    EmployerFeedbackSubmission,
    EmployerFeedbackResponse
)
from app.services.skill_gap_engine import resolve_trainee_user
from app.services.employer_matching_service import (
    get_candidate_matches_for_job,
    get_public_candidate_passport,
    log_employer_contact,
    ensure_default_employer_and_jobs
)
from app.services.skill_gap_engine import REQUIRED_LEVEL_THRESHOLDS

router = APIRouter(prefix="/api/employer", tags=["Employer Portal & Candidate Matching"])


def format_job_posting_response(job: JobPosting, db: Session) -> JobPostingResponse:
    req_skills: List[JobRoleSkillRequirementResponse] = []
    if job.job_role and job.job_role.requirements:
        for r in job.job_role.requirements:
            s_name = r.skill.name if r.skill else f"Skill-{r.skill_id}"
            th = REQUIRED_LEVEL_THRESHOLDS.get(r.required_level.upper(), 60.0)
            req_skills.append(
                JobRoleSkillRequirementResponse(
                    skill_id=r.skill_id,
                    skill_name=s_name,
                    required_level=r.required_level,
                    threshold_pct=th
                )
            )

    employer_name = job.employer.name if job.employer else "Authorized NCCT Employer"
    role_title = job.job_role.title if job.job_role else "Cooperative Professional"

    # Count matching trainees
    trainees_count = db.query(User).filter(User.role == UserRole.TRAINEE).count()

    return JobPostingResponse(
        id=job.id,
        employer_id=job.employer_id,
        employer_name=employer_name,
        job_role_id=job.job_role_id,
        job_role_title=role_title,
        title=job.title,
        description=job.description,
        location=job.location,
        posted_at=job.posted_at,
        is_active=bool(job.is_active) if hasattr(job, 'is_active') and job.is_active is not None else True,
        status="ACTIVE" if getattr(job, 'is_active', True) else "INACTIVE",
        required_skills=req_skills,
        total_candidates_matched=trainees_count
    )


@router.post("/job-postings", response_model=JobPostingResponse, status_code=status.HTTP_201_CREATED)
def create_job_posting(
    req: JobPostingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Creates a new job posting for the authenticated employer.
    Auto-binds required skills defined for that Job Role.
    """
    job_role = db.query(JobRole).filter(JobRole.id == req.job_role_id).first()
    if not job_role:
        raise HTTPException(status_code=404, detail="Selected Job Role does not exist")

    is_act = req.is_active if req.is_active is not None else True
    job = JobPosting(
        employer_id=current_user.id,
        job_role_id=req.job_role_id,
        title=req.title.strip(),
        description=req.description.strip() if req.description else None,
        location=req.location.strip() if req.location else "National / Hybrid",
        posted_at=datetime.utcnow(),
        is_active=is_act,
        status="ACTIVE" if is_act else "INACTIVE"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return format_job_posting_response(job, db)


@router.get("/job-postings", response_model=List[JobPostingResponse])
def list_job_postings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Lists own job postings for the authenticated employer.
    """
    jobs = db.query(JobPosting).filter(
        JobPosting.employer_id == current_user.id
    ).order_by(JobPosting.posted_at.desc()).all()

    return [format_job_posting_response(j, db) for j in jobs]


@router.get("/job-postings/{id}", response_model=JobPostingResponse)
def get_job_posting(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Returns single job posting details and required skills pulled from JobRoleSkillRequirement via job_role_id.
    """
    job = db.query(JobPosting).filter(JobPosting.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job posting {id} not found")

    return format_job_posting_response(job, db)


@router.patch("/job-postings/{id}", response_model=JobPostingResponse)
def update_job_posting(
    id: int,
    req: JobPostingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Updates or deactivates an existing job posting owned by the employer.
    """
    job = db.query(JobPosting).filter(JobPosting.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job posting {id} not found")

    if job.employer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this job posting")

    if req.title is not None:
        job.title = req.title.strip()
    if req.description is not None:
        job.description = req.description.strip()
    if req.location is not None:
        job.location = req.location.strip()
    if req.job_role_id is not None:
        role = db.query(JobRole).filter(JobRole.id == req.job_role_id).first()
        if not role:
            raise HTTPException(status_code=404, detail="Selected Job Role does not exist")
        job.job_role_id = req.job_role_id
    if req.is_active is not None:
        job.is_active = req.is_active
        job.status = "ACTIVE" if req.is_active else "INACTIVE"

    db.commit()
    db.refresh(job)

    return format_job_posting_response(job, db)



@router.get("/job-postings/{id}/matches", response_model=List[CandidateMatch])
def get_job_candidate_matches(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Candidate matching endpoint:
    - Verifies the employer owns this job posting.
    - Calls matching_service.get_candidates_for_job(id, db).
    - Returns sorted list of candidates with match_percentage, matched_skills, and gap_skills.
    """
    job = db.query(JobPosting).filter(JobPosting.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job posting {id} not found")

    if job.employer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You do not have permission to view matches for this job posting")

    try:
        from app.services.matching_service import get_candidates_for_job
        matches = get_candidates_for_job(id, db)
        return [CandidateMatch(**m) for m in matches]
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate candidate matches: {str(e)}")



@router.get("/candidate/{trainee_id}/public-passport", response_model=PublicSkillPassportResponse)
def get_candidate_public_passport(
    trainee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Employer-authorized candidate view:
    Returns ONLY authorized/public fields of the skill passport:
    - Candidate Name, Skills (Skill: Level X format), Verified Certificates, Institution, Education.
    PRIVACY PROTECTION:
    - Excludes phone numbers, residential addresses, and private contact PII.
    """
    try:
        data = get_public_candidate_passport(trainee_id, db)
        return PublicSkillPassportResponse(**data)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve candidate passport: {str(e)}")


@router.post("/contact-candidate", response_model=ContactCandidateResponse)
def contact_candidate(
    req: ContactCandidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER", "ADMIN"]))
):
    """
    Logs employer interest in a matched candidate and queues an interview inquiry/notification.
    """
    try:
        contact = log_employer_contact(
            employer_id=current_user.id,
            trainee_id=req.trainee_id,
            job_posting_id=req.job_posting_id,
            message=req.message,
            db=db
        )
        return ContactCandidateResponse(
            success=True,
            message=f"Candidate interest logged successfully. Notification dispatched to candidate.",
            contact_id=contact.id,
            trainee_name=contact.trainee.name,
            created_at=contact.created_at
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record employer contact: {str(e)}")


def format_employment_record_response(rec: EmploymentRecord, db: Session) -> EmploymentRecordResponse:
    t_name = rec.trainee.name if rec.trainee else f"Trainee #{rec.trainee_id}"
    t_profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == rec.trainee_id).first()
    t_code = t_profile.trainee_id if t_profile and t_profile.trainee_id else f"NCCT-TR-{rec.trainee_id:05d}"

    emp_name = rec.employer.name if rec.employer else f"Employer #{rec.employer_id}"
    j_title = rec.job_posting.title if rec.job_posting else f"Job #{rec.job_posting_id}"

    return EmploymentRecordResponse(
        id=rec.id,
        trainee_id=rec.trainee_id,
        trainee_code=t_code,
        trainee_name=t_name,
        employer_id=rec.employer_id,
        employer_name=emp_name,
        job_posting_id=rec.job_posting_id,
        job_title=j_title,
        hired_date=rec.hired_date,
        status=rec.status
    )


def format_feedback_response(fb: EmployerFeedback) -> EmployerFeedbackResponse:
    s_name = fb.skill.name if fb.skill else f"Skill #{fb.skill_id}"
    r_val = fb.rating.value if hasattr(fb.rating, "value") else str(fb.rating)
    return EmployerFeedbackResponse(
        id=fb.id,
        employment_record_id=fb.employment_record_id,
        skill_id=fb.skill_id,
        skill_name=s_name,
        rating=r_val,
        comments=fb.comments,
        submitted_at=fb.submitted_at
    )


@router.post("/employment-records", response_model=EmploymentRecordResponse, status_code=status.HTTP_201_CREATED)
def create_employment_record(
    req: EmploymentRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Marks a matched candidate as hired for a job posting owned by the employer.
    """
    job = db.query(JobPosting).filter(JobPosting.id == req.job_posting_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job posting {req.job_posting_id} not found")

    if job.employer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You do not have permission to hire for this job posting")

    target_trainee = resolve_trainee_user(req.trainee_id, db)
    if not target_trainee:
        raise HTTPException(status_code=404, detail=f"Trainee '{req.trainee_id}' not found")

    h_date = req.hired_date or datetime.utcnow()
    status_str = (req.status or "ACTIVE").upper()

    record = EmploymentRecord(
        trainee_id=target_trainee.id,
        employer_id=current_user.id,
        job_posting_id=job.id,
        hired_date=h_date,
        status=status_str
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return format_employment_record_response(record, db)


@router.get("/employment-records", response_model=List[EmploymentRecordResponse])
def list_employment_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Lists employer's hires.
    """
    query = db.query(EmploymentRecord)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(EmploymentRecord.employer_id == current_user.id)
    records = query.order_by(EmploymentRecord.hired_date.desc()).all()
    return [format_employment_record_response(r, db) for r in records]


@router.post("/feedback", response_model=List[EmployerFeedbackResponse], status_code=status.HTTP_201_CREATED)
def submit_employer_feedback(
    payload: Any = Body(...),
    employment_record_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Submits skill ratings for an employment record.
    Accepts an array of {skill_id, rating, comments}, with employment_record_id in the body or query parameter.
    """
    target_rec_id = employment_record_id
    raw_items: List[Dict[str, Any]] = []

    if isinstance(payload, list):
        raw_items = payload
        if not target_rec_id and len(raw_items) > 0 and "employment_record_id" in raw_items[0]:
            target_rec_id = raw_items[0].get("employment_record_id")
    elif isinstance(payload, dict):
        if not target_rec_id:
            target_rec_id = payload.get("employment_record_id")
        for key in ["feedback", "ratings", "items", "skill_ratings", "skills"]:
            if key in payload and isinstance(payload[key], list):
                raw_items = payload[key]
                break
        if not raw_items and "skill_id" in payload:
            raw_items = [payload]
    elif hasattr(payload, "feedback") and payload.feedback:
        if not target_rec_id:
            target_rec_id = getattr(payload, "employment_record_id", None)
        raw_items = [item.model_dump() if hasattr(item, "model_dump") else dict(item) for item in payload.feedback]

    if not target_rec_id:
        raise HTTPException(status_code=400, detail="employment_record_id must be provided in body or query parameters")

    rec = db.query(EmploymentRecord).filter(EmploymentRecord.id == target_rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Employment record {target_rec_id} not found")

    if rec.employer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You do not have permission to submit feedback for this employment record")

    if not raw_items:
        raise HTTPException(status_code=400, detail="Feedback array cannot be empty")

    results: List[EmployerFeedback] = []
    for item in raw_items:
        s_id = item.get("skill_id")
        if not s_id:
            continue
        skill = db.query(Skill).filter(Skill.id == s_id).first()
        if not skill:
            raise HTTPException(status_code=404, detail=f"Skill with id {s_id} not found")

        r_str = str(item.get("rating", "MEDIUM")).upper()
        if r_str not in FeedbackRating.__members__:
            valid_keys = list(FeedbackRating.__members__.keys())
            raise HTTPException(status_code=400, detail=f"Invalid rating '{r_str}'. Must be one of: {valid_keys}")

        rating_enum = FeedbackRating[r_str]
        comm = item.get("comments")

        fb = EmployerFeedback(
            employment_record_id=rec.id,
            skill_id=s_id,
            rating=rating_enum,
            comments=comm,
            submitted_at=datetime.utcnow()
        )
        db.add(fb)
        results.append(fb)

    db.commit()
    for fb in results:
        db.refresh(fb)

    return [format_feedback_response(fb) for fb in results]


@router.get("/employment-records/{id}/feedback", response_model=List[EmployerFeedbackResponse])
def get_employment_record_feedback(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["EMPLOYER"]))
):
    """
    Views submitted feedback for an employment record.
    """
    rec = db.query(EmploymentRecord).filter(EmploymentRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Employment record {id} not found")

    if rec.employer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You do not have permission to view feedback for this employment record")

    feedbacks = db.query(EmployerFeedback).filter(
        EmployerFeedback.employment_record_id == id
    ).order_by(EmployerFeedback.submitted_at.desc()).all()

    return [format_feedback_response(fb) for fb in feedbacks]

