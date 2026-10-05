from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import JobRole, User, TraineeProfile
from app.schemas import (
    JobRoleResponse, JobRoleDetailResponse,
    SkillGapAnalysisResponse, TraineeRecommendationsResponse,
    RecommendedModuleItem
)
from app.dependencies import get_current_user
from app.services.skill_gap_engine import (
    ensure_default_job_roles,
    compare_trainee_to_role,
    get_recommended_modules,
    resolve_trainee_user,
    REQUIRED_LEVEL_THRESHOLDS
)

router = APIRouter(prefix="/api/skills", tags=["AI Skill-Gap Engine"])


@router.get("/job-roles", response_model=List[JobRoleDetailResponse])
def get_job_roles(db: Session = Depends(get_db)):
    """
    Returns list of all registered job roles with their required skill thresholds.
    """
    ensure_default_job_roles(db)
    roles = db.query(JobRole).all()
    results = []
    for r in roles:
        reqs = []
        for req in r.requirements:
            s = req.skill
            if s:
                th = REQUIRED_LEVEL_THRESHOLDS.get(req.required_level.upper(), 60.0)
                reqs.append({
                    "id": req.id,
                    "skill_id": s.id,
                    "skill_name": s.name,
                    "required_level": req.required_level,
                    "required_threshold": th
                })
        results.append({
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "created_at": r.created_at,
            "requirements": reqs
        })
    return results


@router.get("/job-roles/{id}", response_model=JobRoleDetailResponse)
def get_job_role_detail(id: int, db: Session = Depends(get_db)):
    """
    Returns specific job role details with skill requirements.
    """
    ensure_default_job_roles(db)
    role = db.query(JobRole).filter(JobRole.id == id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Job role not found")

    reqs = []
    for req in role.requirements:
        s = req.skill
        if s:
            th = REQUIRED_LEVEL_THRESHOLDS.get(req.required_level.upper(), 60.0)
            reqs.append({
                "id": req.id,
                "skill_id": s.id,
                "skill_name": s.name,
                "required_level": req.required_level,
                "required_threshold": th
            })

    return {
        "id": role.id,
        "title": role.title,
        "description": role.description,
        "created_at": role.created_at,
        "requirements": reqs
    }


@router.get("/gap-analysis/{trainee_id}/{job_role_id}", response_model=SkillGapAnalysisResponse)
def analyze_trainee_skill_gap(
    trainee_id: str,
    job_role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Performs AI Skill-Gap Analysis comparing trainee evaluated skills to the target Job Role requirements.
    Identifies matched skills and flagged skill gaps.
    """
    ensure_default_job_roles(db)

    # Resolve trainee
    effective_id = current_user.id if trainee_id == "me" else trainee_id
    target_user = resolve_trainee_user(effective_id, db)
    if not target_user:
        raise HTTPException(status_code=404, detail=f"Trainee '{trainee_id}' not found")

    role = db.query(JobRole).filter(JobRole.id == job_role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Job role not found")

    # Run engine comparison
    comparisons = compare_trainee_to_role(target_user.id, role.id, db)

    total_req = len(comparisons)
    gaps = [c for c in comparisons if c.get("gap") is True]
    matched = [c for c in comparisons if c.get("gap") is False]

    # Calculate overall match percentage (ratio of matched skills or average competency vs requirements)
    match_pct = round((len(matched) / total_req * 100), 1) if total_req > 0 else 0.0

    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == target_user.id).first()
    trainee_code = profile.trainee_id if profile else f"NCCT-TR-{target_user.id}"

    return {
        "trainee_id": trainee_code,
        "trainee_name": target_user.name,
        "job_role_id": role.id,
        "job_role_title": role.title,
        "job_role_description": role.description,
        "overall_match_percentage": match_pct,
        "total_skills_required": total_req,
        "skills_matched": len(matched),
        "skills_gap_count": len(gaps),
        "skills": comparisons,
    }


@router.get("/recommendations/{trainee_id}", response_model=TraineeRecommendationsResponse)
def get_trainee_recommendations(
    trainee_id: str,
    job_role_id: Optional[int] = Query(None, description="Optional target job role ID to base recommendations on"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns AI-generated learning module recommendations for a trainee based on identified skill gaps.
    """
    ensure_default_job_roles(db)

    effective_id = current_user.id if trainee_id == "me" else trainee_id
    target_user = resolve_trainee_user(effective_id, db)
    if not target_user:
        raise HTTPException(status_code=404, detail=f"Trainee '{trainee_id}' not found")

    # Determine job role to analyze
    target_role: Optional[JobRole] = None
    if job_role_id:
        target_role = db.query(JobRole).filter(JobRole.id == job_role_id).first()
    if not target_role:
        target_role = db.query(JobRole).first()

    role_id = target_role.id if target_role else 1
    role_title = target_role.title if target_role else "Target Job Role"

    # Analyze gaps
    comparisons = compare_trainee_to_role(target_user.id, role_id, db)
    gaps = [c for c in comparisons if c.get("gap") is True]

    # Get recommended modules
    rec_items = get_recommended_modules(gaps, target_user.id, db)

    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == target_user.id).first()
    trainee_code = profile.trainee_id if profile else f"NCCT-TR-{target_user.id}"

    return {
        "trainee_id": trainee_code,
        "trainee_name": target_user.name,
        "job_role_id": target_role.id if target_role else None,
        "job_role_title": role_title,
        "total_gaps_identified": len(gaps),
        "recommendations": rec_items
    }
