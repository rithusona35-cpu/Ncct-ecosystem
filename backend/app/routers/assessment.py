from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    Skill, CourseSkillMap, Assessment, AssessmentQuestion,
    AssessmentResult, TrainingProgramme, User, UserRole, TraineeProfile
)
from app.schemas import (
    SkillResponse, AssessmentCreate, AssessmentResponse,
    AssessmentQuestionPublic, AssessmentSubmitRequest,
    AssessmentSubmitResponse, SkillScoreItem, TraineeSkillScoreSummary
)
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/assessment", tags=["Skill-Linked Assessment"])
skills_router = APIRouter(prefix="/api/skills", tags=["NCCT Skill Registry"])


def ensure_default_skills(db: Session) -> List[Skill]:
    """
    Ensure core NCCT skills exist in the registry.
    """
    default_skills = [
        {"name": "Accounting", "category": "Finance & Accounts"},
        {"name": "ERP", "category": "Enterprise Systems"},
        {"name": "GST", "category": "Taxation & Compliance"},
        {"name": "Communication", "category": "Professional Skills"},
        {"name": "Cooperative Law", "category": "Legal & Governance"},
    ]

    for item in default_skills:
        existing = db.query(Skill).filter(Skill.name == item["name"]).first()
        if not existing:
            db.add(Skill(name=item["name"], category=item["category"]))
    db.commit()
    return db.query(Skill).all()


@skills_router.get("", response_model=List[SkillResponse])
def get_all_skills(db: Session = Depends(get_db)):
    """
    Returns all registered NCCT competency skills.
    """
    skills = ensure_default_skills(db)
    return skills


@router.post("", response_model=AssessmentResponse)
def create_assessment(
    req: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TRAINER", "ADMIN"]))
):
    """
    Trainer creates a skill-linked assessment with questions tagged by Skill.
    """
    course = db.query(TrainingProgramme).filter(TrainingProgramme.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Training course not found")

    assessment = Assessment(
        course_id=req.course_id,
        title=req.title,
        type=req.type,
        created_at=datetime.utcnow()
    )
    db.add(assessment)
    db.flush()

    total_marks = 0
    questions_res: List[AssessmentQuestionPublic] = []

    for q_in in req.questions:
        skill = db.query(Skill).filter(Skill.id == q_in.skill_id).first()
        if not skill:
            raise HTTPException(status_code=400, detail=f"Skill ID {q_in.skill_id} not found")

        q = AssessmentQuestion(
            assessment_id=assessment.id,
            skill_id=q_in.skill_id,
            text=q_in.text,
            options=q_in.options,
            correct_option=q_in.correct_option,
            marks=q_in.marks
        )
        db.add(q)
        db.flush()
        total_marks += q.marks

        questions_res.append(AssessmentQuestionPublic(
            id=q.id,
            assessment_id=q.assessment_id,
            skill_id=q.skill_id,
            skill_name=skill.name,
            text=q.text,
            options=q.options,
            marks=q.marks
        ))

    db.commit()
    db.refresh(assessment)

    return AssessmentResponse(
        id=assessment.id,
        course_id=assessment.course_id,
        course_title=course.title,
        title=assessment.title,
        type=assessment.type,
        created_at=assessment.created_at,
        questions=questions_res,
        total_questions=len(questions_res),
        total_marks=total_marks
    )


@router.get("/course/{course_id}", response_model=List[AssessmentResponse])
def get_course_assessments(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all skill-linked assessments for a given training course.
    """
    course = db.query(TrainingProgramme).filter(TrainingProgramme.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    assessments = db.query(Assessment).filter(Assessment.course_id == course_id).all()
    results: List[AssessmentResponse] = []

    for a in assessments:
        q_list = [
            AssessmentQuestionPublic(
                id=q.id,
                assessment_id=q.assessment_id,
                skill_id=q.skill_id,
                skill_name=q.skill.name if q.skill else "General",
                text=q.text,
                options=q.options,
                marks=q.marks
            ) for q in a.questions
        ]
        results.append(AssessmentResponse(
            id=a.id,
            course_id=a.course_id,
            course_title=course.title,
            title=a.title,
            type=a.type,
            created_at=a.created_at,
            questions=q_list,
            total_questions=len(q_list),
            total_marks=sum(q.marks for q in a.questions)
        ))
    return results


@router.get("/{id}", response_model=AssessmentResponse)
def get_assessment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches assessment details and questions with skill tags.
    """
    assessment = db.query(Assessment).filter(Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    questions_res = [
        AssessmentQuestionPublic(
            id=q.id,
            assessment_id=q.assessment_id,
            skill_id=q.skill_id,
            skill_name=q.skill.name if q.skill else "General",
            text=q.text,
            options=q.options,
            marks=q.marks
        ) for q in assessment.questions
    ]

    return AssessmentResponse(
        id=assessment.id,
        course_id=assessment.course_id,
        course_title=assessment.programme.title if assessment.programme else None,
        title=assessment.title,
        type=assessment.type,
        created_at=assessment.created_at,
        questions=questions_res,
        total_questions=len(questions_res),
        total_marks=sum(q.marks for q in assessment.questions)
    )


@router.post("/{id}/submit", response_model=AssessmentSubmitResponse)
def submit_assessment(
    id: int,
    req: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates MCQ answers, calculates per-skill score breakdown by aggregating marks
    for questions tagged with each skill, and stores in AssessmentResult.
    """
    assessment = db.query(Assessment).filter(Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Skill score aggregation accumulator
    # skill_id -> { "name": str, "marks_obtained": int, "total_marks": int }
    skill_stats: Dict[int, Dict[str, Any]] = {}
    total_marks_possible = 0
    total_marks_earned = 0

    for q in assessment.questions:
        s_id = q.skill_id
        s_name = q.skill.name if q.skill else f"Skill-{s_id}"

        if s_id not in skill_stats:
            skill_stats[s_id] = {
                "skill_name": s_name,
                "marks_obtained": 0,
                "total_marks": 0
            }

        skill_stats[s_id]["total_marks"] += q.marks
        total_marks_possible += q.marks

        # Check trainee answer
        user_choice = req.answers.get(str(q.id))
        if user_choice is None:
            user_choice = req.answers.get(int(q.id))

        if user_choice is not None and int(user_choice) == int(q.correct_option):
            skill_stats[s_id]["marks_obtained"] += q.marks
            total_marks_earned += q.marks

    # Compute per-skill percentages
    skill_wise_score_dict: Dict[str, Any] = {}
    for s_id, data in skill_stats.items():
        pct = round((data["marks_obtained"] / data["total_marks"] * 100), 1) if data["total_marks"] > 0 else 0.0
        skill_wise_score_dict[str(s_id)] = {
            "skill_id": s_id,
            "skill_name": data["skill_name"],
            "marks_obtained": data["marks_obtained"],
            "total_marks": data["total_marks"],
            "percentage": pct
        }

    overall_pct = round((total_marks_earned / total_marks_possible * 100), 1) if total_marks_possible > 0 else 100.0

    result = AssessmentResult(
        trainee_id=current_user.id,
        assessment_id=assessment.id,
        skill_wise_score=skill_wise_score_dict,
        overall_score=overall_pct,
        total_marks_earned=total_marks_earned,
        total_marks_possible=total_marks_possible,
        answers=req.answers,
        submitted_at=datetime.utcnow()
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    # Auto-issue certificate if course completion is 100% and assessment passed (>= 60%)
    try:
        from app.services.certificate_service import check_and_issue_certificate
        check_and_issue_certificate(current_user.id, assessment.course_id, db, score_threshold=60.0)
    except Exception:
        pass

    typed_skill_scores = {
        k: SkillScoreItem(**v) for k, v in skill_wise_score_dict.items()
    }

    return AssessmentSubmitResponse(
        result_id=result.id,
        assessment_id=assessment.id,
        overall_score=result.overall_score,
        total_marks_earned=result.total_marks_earned,
        total_marks_possible=result.total_marks_possible,
        skill_wise_score=typed_skill_scores,
        submitted_at=result.submitted_at
    )


@router.get("/trainee/{id}/skill-scores", response_model=TraineeSkillScoreSummary)
def get_trainee_skill_scores(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns latest skill scores per skill for that trainee (feeds Skill-Gap Engine).
    Accepts 'me', user integer ID, or Trainee ID string (NCCT-TR-2026-00001).
    """
    target_user: Optional[User] = None
    if id == "me":
        target_user = current_user
    elif id.isdigit():
        target_user = db.query(User).filter(User.id == int(id)).first()
    else:
        profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == id).first()
        if profile:
            target_user = profile.user

    if not target_user:
        raise HTTPException(status_code=404, detail=f"Trainee '{id}' not found")

    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == target_user.id).first()
    trainee_code = profile.trainee_id if profile else f"TR-{target_user.id}"

    # Get all assessment results for this trainee ordered by submission time
    results = db.query(AssessmentResult).filter(
        AssessmentResult.trainee_id == target_user.id
    ).order_by(desc(AssessmentResult.submitted_at)).all()

    # Aggregate latest score for each skill
    latest_skills: Dict[int, SkillScoreItem] = {}

    for res in results:
        scores = res.skill_wise_score or {}
        for s_id_str, s_data in scores.items():
            s_id = int(s_id_str)
            if s_id not in latest_skills:
                latest_skills[s_id] = SkillScoreItem(
                    skill_id=s_id,
                    skill_name=s_data.get("skill_name", f"Skill-{s_id}"),
                    marks_obtained=s_data.get("marks_obtained", 0),
                    total_marks=s_data.get("total_marks", 0),
                    percentage=s_data.get("percentage", 0.0)
                )

    # If no assessments taken yet, list default skills with 0% baseline
    if len(latest_skills) == 0:
        default_skills = ensure_default_skills(db)
        for s in default_skills:
            latest_skills[s.id] = SkillScoreItem(
                skill_id=s.id,
                skill_name=s.name,
                marks_obtained=0,
                total_marks=10,
                percentage=0.0
            )

    return TraineeSkillScoreSummary(
        trainee_id=trainee_code,
        trainee_name=target_user.name,
        skills=list(latest_skills.values())
    )
