from datetime import datetime
from typing import Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole, TraineeProfile
from app.schemas import TraineeProfileCreateUpdate, TraineeProfileResponse
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/trainee", tags=["Trainee Profile"])

def generate_unique_trainee_id(db: Session) -> str:
    """
    Auto-generates a unique Trainee ID in format: NCCT-TR-{YEAR}-{NUMBER:05d}
    Example: NCCT-TR-2025-00001
    """
    year = datetime.utcnow().year
    prefix = f"NCCT-TR-{year}-"

    # Find the highest existing sequence number for this prefix
    last_profile = (
        db.query(TraineeProfile)
        .filter(TraineeProfile.trainee_id.like(f"{prefix}%"))
        .order_by(TraineeProfile.id.desc())
        .first()
    )

    next_num = 1
    if last_profile and last_profile.trainee_id:
        try:
            parts = last_profile.trainee_id.split("-")
            next_num = int(parts[-1]) + 1
        except Exception:
            next_num = db.query(TraineeProfile).count() + 1

    # Ensure uniqueness in case of race condition or gaps
    while True:
        candidate_id = f"{prefix}{next_num:05d}"
        exists = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == candidate_id).first()
        if not exists:
            return candidate_id
        next_num += 1

def build_profile_response(profile: TraineeProfile, user: User) -> TraineeProfileResponse:
    return TraineeProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        trainee_id=profile.trainee_id,
        name=user.name,
        email=user.email,
        institution=profile.institution,
        course_enrolled=profile.course_enrolled,
        education=profile.education,
        preferred_language=profile.preferred_language,
        previous_skills=profile.previous_skills or [],
        phone=profile.phone,
        address=profile.address,
        created_at=profile.created_at
    )

@router.post("/profile", response_model=TraineeProfileResponse, status_code=status.HTTP_200_OK)
def create_or_update_profile(
    data: TraineeProfileCreateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.TRAINEE, UserRole.ADMIN]))
):
    """
    Create or update profile for current logged-in trainee.
    Auto-generates unique Trainee ID like NCCT-TR-2025-00001 on initial creation.
    """
    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == current_user.id).first()

    if data.name:
        current_user.name = data.name

    if profile is None:
        # Create new profile
        new_trainee_id = generate_unique_trainee_id(db)
        profile = TraineeProfile(
            user_id=current_user.id,
            trainee_id=new_trainee_id,
            institution=data.institution,
            course_enrolled=data.course_enrolled,
            education=data.education,
            preferred_language=data.preferred_language,
            previous_skills=data.previous_skills,
            phone=data.phone,
            address=data.address
        )
        db.add(profile)
    else:
        # Update existing profile
        profile.institution = data.institution
        profile.course_enrolled = data.course_enrolled
        profile.education = data.education
        profile.preferred_language = data.preferred_language
        profile.previous_skills = data.previous_skills
        profile.phone = data.phone
        profile.address = data.address

    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    return build_profile_response(profile, current_user)

@router.get("/profile/me", response_model=TraineeProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve profile of the currently authenticated trainee.
    """
    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == current_user.id).first()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainee profile has not been completed yet."
        )
    return build_profile_response(profile, current_user)

@router.get("/profile/{identifier}", response_model=TraineeProfileResponse)
def get_profile_by_id(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve trainee profile by profile ID (integer) or Trainee ID string (NCCT-TR-...).
    Trainees can only access their own profile. Trainers and Admins can access any profile.
    """
    profile = None
    if identifier.isdigit():
        profile = db.query(TraineeProfile).filter(TraineeProfile.id == int(identifier)).first()
    
    if profile is None:
        profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == identifier).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trainee profile with identifier '{identifier}' was not found."
        )

    # Role-based restriction: Trainee can only view their own profile
    if current_user.role == UserRole.TRAINEE and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You are only authorized to view your own profile."
        )

    user = db.query(User).filter(User.id == profile.user_id).first()
    return build_profile_response(profile, user or current_user)
