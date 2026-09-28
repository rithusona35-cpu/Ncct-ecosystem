from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import SessionLocal
from app.models import (
    User, UserRole, TraineeProfile, JobRole, JobRoleSkillRequirement,
    JobPosting, EmployerCandidateContact, Certificate, Skill
)
from app.services.skill_gap_engine import (
    compare_trainee_to_role,
    resolve_trainee_user,
    ensure_default_job_roles,
    REQUIRED_LEVEL_THRESHOLDS
)
from app.services.skill_passport_service import get_skill_passport
from app.security import hash_password


def ensure_default_employer_and_jobs(db: Session) -> User:
    """
    Ensures at least one default employer account and initial job posting exists
    for testing and verification out of the box.
    """
    ensure_default_job_roles(db)

    # 1. Employer Account
    employer = db.query(User).filter(User.email == "recruiter@khedut-bank.coop").first()
    if not employer:
        employer = db.query(User).filter(User.role == UserRole.EMPLOYER).first()

    if not employer:
        employer = User(
            name="Gujarat State Cooperative Bank HR",
            email="recruiter@khedut-bank.coop",
            hashed_password=hash_password("Password123!"),
            role=UserRole.EMPLOYER,
            created_at=datetime.utcnow()
        )
        db.add(employer)
        db.commit()
        db.refresh(employer)

    # 2. Default Job Posting: Cooperative Accountant
    job_role = db.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()
    if not job_role:
        job_role = db.query(JobRole).first()

    if job_role:
        existing_job = db.query(JobPosting).filter(
            JobPosting.job_role_id == job_role.id,
            JobPosting.employer_id == employer.id
        ).first()

        if not existing_job:
            sample_job = JobPosting(
                employer_id=employer.id,
                job_role_id=job_role.id,
                title="Cooperative Accountant & PACS Operations Lead",
                description="Seeking a certified cooperative accountant capable of managing daily double-entry ledgers, member dividend allocations, and ERP integrations across 12 PACS societies.",
                location="Pune / Ahmedabad (Hybrid)",
                posted_at=datetime.utcnow(),
                status="ACTIVE"
            )
            db.add(sample_job)
            db.commit()

    return employer


def get_candidate_matches_for_job(
    job_posting_id: int,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Candidate Matching Engine:
    Given a job_posting_id, fetches all trainees, runs skill_gap_engine.compare_trainee_to_role
    for each, and ranks candidates by:
      1. Match Percentage (matched_skills / total_required_skills)
      2. Average competency score on required skills
      3. Number of verified NCCT certificates
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        ensure_default_job_roles(db)
        job_posting = db.query(JobPosting).filter(JobPosting.id == job_posting_id).first()
        if not job_posting:
            raise ValueError(f"Job posting {job_posting_id} not found")

        job_role = job_posting.job_role
        if not job_role:
            raise ValueError("Associated job role not found")

        # Fetch all trainees
        trainees = db.query(User).filter(User.role == UserRole.TRAINEE).all()
        total_req_count = len(job_role.requirements)

        matches_list: List[Dict[str, Any]] = []

        for trainee in trainees:
            profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == trainee.id).first()
            trainee_code = profile.trainee_id if profile else f"NCCT-TR-{trainee.id:05d}"
            institution = profile.institution if profile else "NCCT Regional Institute"
            education = profile.education if profile else "Graduate"

            # Compare trainee against the job role
            comparisons = compare_trainee_to_role(trainee.id, job_role.id, db)

            matched_skills: List[str] = []
            gap_skills: List[str] = []
            score_accumulator = 0.0

            for comp in comparisons:
                score_accumulator += comp["trainee_level"]
                s_name = comp["skill_name"]
                if not comp["gap"]:
                    matched_skills.append(f"{s_name} ({comp['trainee_level']}%)")
                else:
                    gap_skills.append(f"{s_name} (Gap: -{comp['gap_percentage']}%)")

            matched_count = len(matched_skills)
            match_pct = round((matched_count / total_req_count * 100), 1) if total_req_count > 0 else 0.0
            avg_score = round((score_accumulator / total_req_count), 1) if total_req_count > 0 else 0.0

            # Verified certificate count
            cert_count = db.query(Certificate).filter(
                Certificate.trainee_id == trainee.id,
                Certificate.is_verified == True
            ).count()

            passport_code = f"NCCT-SP-{trainee_code.replace('NCCT-TR-', '')}"

            # Check if employer has already contacted candidate
            contact_record = db.query(EmployerCandidateContact).filter(
                EmployerCandidateContact.job_posting_id == job_posting_id,
                EmployerCandidateContact.trainee_id == trainee.id
            ).first()

            matches_list.append({
                "trainee_id": trainee_code,
                "user_id": trainee.id,
                "candidate_name": trainee.name,
                "institution": institution,
                "education": education,
                "match_percentage": match_pct,
                "average_score": avg_score,
                "matched_skills": matched_skills,
                "gap_skills": gap_skills,
                "skill_breakdown": comparisons,
                "certificates_count": cert_count,
                "passport_code": passport_code,
                "has_been_contacted": contact_record is not None,
                "contact_date": contact_record.created_at if contact_record else None
            })

        # Rank candidates: 1. match_percentage DESC, 2. avg_score DESC, 3. cert_count DESC
        matches_list.sort(key=lambda x: (x["match_percentage"], x["average_score"], x["certificates_count"]), reverse=True)

        # Assign 1-indexed rank
        for idx, candidate in enumerate(matches_list, 1):
            candidate["rank"] = idx

        return {
            "job_posting_id": job_posting.id,
            "job_title": job_posting.title,
            "job_role_title": job_role.title,
            "location": job_posting.location,
            "total_candidates": len(matches_list),
            "matches": matches_list
        }
    finally:
        if should_close:
            db.close()


def get_public_candidate_passport(
    trainee_id: Union[int, str],
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Returns ONLY authorized/public fields of the skill passport:
    - Candidate Name, Trainee ID, Passport Code, Institution, Education.
    - Verified Skill Levels (Skill: Level X format, gauges, percentages).
    - Verified Certificates list.
    - Summary metrics.
    
    PRIVACY GUARANTEE:
    - Strictly excludes personal data: phone, residential address, raw email, date of birth, etc.
    """
    passport_data = get_skill_passport(trainee_id, db)

    # Sanitize and strip non-authorized fields
    public_passport = {
        "trainee_id": passport_data["trainee_id"],
        "name": passport_data["name"],
        "institution": passport_data.get("institution"),
        "education": passport_data.get("education"),
        "passport_code": passport_data["passport_code"],
        "skills": passport_data["skills"],
        "certificates_count": passport_data["certificates_count"],
        "completed_courses_count": passport_data["completed_courses_count"],
        "completed_projects_count": passport_data["completed_projects_count"],
        "overall_score": passport_data["overall_score"],
        "overall_level": passport_data["overall_level"],
        "overall_level_label": passport_data["overall_level_label"],
        "certificates": passport_data.get("certificates", []),
        "issued_at": passport_data["issued_at"],
        "is_public_view": True
    }
    return public_passport


def log_employer_contact(
    employer_id: int,
    trainee_id: Union[int, str],
    job_posting_id: int,
    message: str,
    db: Session
) -> EmployerCandidateContact:
    """
    Logs an employer's contact/interest inquiry for a candidate.
    """
    trainee = resolve_trainee_user(trainee_id, db)
    if not trainee:
        raise ValueError(f"Trainee '{trainee_id}' not found")

    job = db.query(JobPosting).filter(JobPosting.id == job_posting_id).first()
    if not job:
        raise ValueError(f"Job posting '{job_posting_id}' not found")

    contact = EmployerCandidateContact(
        employer_id=employer_id,
        trainee_id=trainee.id,
        job_posting_id=job_posting_id,
        message=message.strip(),
        created_at=datetime.utcnow(),
        status="SENT"
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact
