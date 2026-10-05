from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.dependencies import require_role
from app.schemas import (
    CommonSkillGapResponse,
    AdminOverviewStatsResponse,
    LowCompletionCourseResponse,
    CombinedSkillGapResponse,
    HighDemandSkillResponse,
)
from app.services.feedback_analytics import get_common_skill_gaps
from app.services.admin_stats_service import (
    get_overview_stats,
    get_low_completion_courses,
    get_combined_skill_gaps,
    get_high_demand_skills,
)

router = APIRouter(prefix="/api/admin", tags=["Admin Analytics & Overview Stats"])


@router.get("/stats/overview", response_model=AdminOverviewStatsResponse)
def get_admin_overview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Returns basic ecosystem overview statistics:
    - total_trainees: count of TraineeProfile
    - total_programmes: count of TrainingProgramme
    - total_institutes: count of Institution
    - overall_completion_rate: avg of Progress completion % across all trainees
    - average_attendance: avg attendance % across all trainees
    """
    return get_overview_stats(db=db)


@router.get("/stats/low-completion-courses", response_model=List[LowCompletionCourseResponse])
def get_admin_low_completion_courses(
    threshold: float = Query(50.0, ge=0.0, le=100.0, description="Completion percentage threshold"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Returns courses where completion rate < threshold (default < 50%),
    including course title and completion %, sorted ascending.
    """
    return get_low_completion_courses(threshold=threshold, db=db)


@router.get("/stats/skill-gaps", response_model=List[CombinedSkillGapResponse])
def get_admin_skill_gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Returns a unified ranked list of skill gaps combining:
    - Employer feedback (low ratings)
    - Trainee LMS training gaps across job role comparisons
    Each entry includes skill_name, source ('employer_feedback', 'training_gap', 'both'), and severity_score.
    """
    return get_combined_skill_gaps(db=db)


@router.get("/stats/high-demand-skills", response_model=List[HighDemandSkillResponse])
def get_admin_high_demand_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Counts how many active JobPostings require each skill (via JobRoleSkillRequirement),
    returning sorted descending by demand count.
    """
    return get_high_demand_skills(db=db)



@router.get("/feedback/skill-gaps", response_model=List[CommonSkillGapResponse])
def get_common_skill_gaps_endpoint(
    min_reports: int = Query(3, ge=1, description="Minimum feedback reports required per skill"),
    low_threshold_ratio: float = Query(0.5, ge=0.0, le=1.0, description="Ratio threshold to flag common skill gap"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Returns a ranked list of industry skill gaps aggregated across all employer feedback:
    - Filters skills with >= min_reports
    - Computes low_rating_ratio
    - Flags skills where low_rating_ratio >= low_threshold_ratio
    - Sorted by low_rating_ratio descending
    """
    gaps = get_common_skill_gaps(
        min_reports=min_reports,
        low_threshold_ratio=low_threshold_ratio,
        db=db
    )
    return gaps

