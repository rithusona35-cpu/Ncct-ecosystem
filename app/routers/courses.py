from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, TraineeProfile, TrainingProgramme, Batch
from app.schemas import EnrolledCourseResponse, ModuleResponse, ContentItemResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/courses", tags=["Trainee Enrolled Courses"])

def build_modules_response(programme: TrainingProgramme) -> List[ModuleResponse]:
    result = []
    for m in programme.modules:
        items = [
            ContentItemResponse(
                id=c.id,
                module_id=c.module_id,
                type=c.type,
                title=c.title,
                url_or_file_path=c.url_or_file_path,
                order=c.order,
                created_at=c.created_at
            ) for c in m.content_items
        ]
        result.append(ModuleResponse(
            id=m.id,
            programme_id=m.programme_id,
            title=m.title,
            order=m.order,
            created_at=m.created_at,
            content_items=items
        ))
    return result

@router.get("/my-courses", response_model=List[EnrolledCourseResponse])
def get_my_enrolled_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns list of training programmes the authenticated trainee is enrolled in through batches.
    """
    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == current_user.id).first()
    if not profile:
        return []

    enrolled_courses: List[EnrolledCourseResponse] = []
    seen_programmes = set()

    for batch in profile.enrolled_batches:
        programme = batch.programme
        if not programme:
            continue

        modules_res = build_modules_response(programme)

        enrolled_courses.append(EnrolledCourseResponse(
            programme_id=programme.id,
            batch_id=batch.id,
            batch_name=batch.batch_name,
            title=programme.title,
            description=programme.description,
            institution_name=programme.institution.name if programme.institution else None,
            trainer_name=programme.trainer.name if programme.trainer else None,
            start_date=programme.start_date,
            end_date=programme.end_date,
            modules=modules_res
        ))

    return enrolled_courses

@router.get("/{programme_id}", response_model=EnrolledCourseResponse)
def get_course_content(
    programme_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    programme = db.query(TrainingProgramme).filter(TrainingProgramme.id == programme_id).first()
    if not programme:
        raise HTTPException(status_code=404, detail="Training programme not found")

    modules_res = build_modules_response(programme)

    return EnrolledCourseResponse(
        programme_id=programme.id,
        batch_id=programme.batches[0].id if programme.batches else 0,
        batch_name=programme.batches[0].batch_name if programme.batches else "Standard",
        title=programme.title,
        description=programme.description,
        institution_name=programme.institution.name if programme.institution else None,
        trainer_name=programme.trainer.name if programme.trainer else None,
        start_date=programme.start_date,
        end_date=programme.end_date,
        modules=modules_res
    )
