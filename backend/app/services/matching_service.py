from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, UserRole, TraineeProfile, JobRole, JobPosting, SkillPassport
from app.services.skill_gap_engine import compare_trainee_to_role, ensure_default_job_roles


def get_candidates_for_job(
    job_posting_id: int,
    db: Optional[Session] = None
) -> List[Dict[str, Any]]:
    """
    Given a job_posting_id:
    1. Fetch job_role_id from the job posting.
    2. For every trainee with a Skill Passport, call skill_gap_engine.compare_trainee_to_role(trainee_id, job_role_id).
    3. Compute match_percentage = matched_skills_count / total_required_skills_count.
    4. Return a sorted list (descending match %) of:
       {
           "trainee_id": str,
           "name": str,
           "match_percentage": float,
           "matched_skills": List[str],
           "gap_skills": List[str]
       }
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        ensure_default_job_roles(db)

        # 1. Fetch job posting & role
        job_posting = db.query(JobPosting).filter(JobPosting.id == job_posting_id).first()
        if not job_posting:
            raise ValueError(f"Job posting {job_posting_id} not found")

        job_role_id = job_posting.job_role_id
        if not job_role_id:
            raise ValueError("Job posting does not have an associated job_role_id")

        # 2. Fetch all trainees with a Skill Passport
        passports = db.query(SkillPassport).all()
        candidates: List[Dict[str, Any]] = []

        seen_user_ids = set()

        for sp in passports:
            user = db.query(User).filter(User.id == sp.trainee_id).first()
            if not user or user.id in seen_user_ids:
                continue
            seen_user_ids.add(user.id)

            # Profile for trainee ID string
            profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == user.id).first()
            trainee_identifier = profile.trainee_id if profile and profile.trainee_id else f"NCCT-TR-{user.id:05d}"

            # Compare trainee to target job role
            comparisons = compare_trainee_to_role(user.id, job_role_id, db)

            total_req = len(comparisons)
            matched_skills: List[str] = []
            gap_skills: List[str] = []

            for comp in comparisons:
                s_name = comp["skill_name"]
                if not comp["gap"]:
                    matched_skills.append(s_name)
                else:
                    gap_skills.append(s_name)

            matched_count = len(matched_skills)
            match_pct = round((matched_count / total_req * 100), 1) if total_req > 0 else 0.0

            candidates.append({
                "trainee_id": trainee_identifier,
                "name": user.name,
                "match_percentage": match_pct,
                "matched_skills": matched_skills,
                "gap_skills": gap_skills
            })

        # 3. Sort candidates descending by match_percentage
        candidates.sort(key=lambda c: c["match_percentage"], reverse=True)

        return candidates
    finally:
        if should_close:
            db.close()
