from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import SkillPassportResponse
from app.dependencies import get_current_user
from app.services.skill_passport_service import get_skill_passport
from app.services.skill_gap_engine import resolve_trainee_user

router = APIRouter(prefix="/api/skill-passport", tags=["Dynamic Skill Passport"])


@router.get("/{trainee_id}", response_model=SkillPassportResponse)
def get_trainee_skill_passport(
    trainee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the dynamic, recomputed-on-read Skill Passport for a trainee.
    Aggregates:
    - Latest skill level per skill (mapped to Level 1-5 format)
    - Count of earned certificates
    - Count of completed courses
    - Count of completed practical assessments/projects
    """
    effective_id = current_user.id if trainee_id == "me" else trainee_id

    # Verify trainee exists
    target_user = resolve_trainee_user(effective_id, db)
    if not target_user:
        raise HTTPException(status_code=404, detail=f"Trainee '{trainee_id}' not found")

    try:
        passport_data = get_skill_passport(target_user.id, db)
        return passport_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating skill passport: {str(e)}")
