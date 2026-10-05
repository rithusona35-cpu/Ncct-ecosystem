from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status, Request
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
router_plural = APIRouter(prefix="/api/assessments", tags=["Skill-Linked Assessment"])
plural_router = router_plural
skills_router = APIRouter(prefix="/api/skills", tags=["NCCT Skill Registry"])


def ensure_default_skills(db: Session) -> List[Skill]:
    """
    Ensure core NCCT skills exist in the registry.
    """
    default_skills = [
        {"name": "Accounting", "category": "Finance & Accounts"},
        {"name": "Cooperative Accounting", "category": "Cooperative Finance"},
        {"name": "ERP", "category": "Enterprise Systems"},
        {"name": "Excel", "category": "Data & Productivity"},
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


def _create_assessment_impl(
    req: AssessmentCreate,
    db: Session,
    current_user: User
) -> AssessmentResponse:
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
            assessment_id=assessment.id,
            skill_id=skill.id,
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


@router.post("", response_model=AssessmentResponse)
@router_plural.post("", response_model=AssessmentResponse)
def create_assessment(
    req: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TRAINER", "ADMIN"]))
):
    return _create_assessment_impl(req, db, current_user)


def _get_course_assessments_impl(course_id: int, db: Session, current_user: User):
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


@router.get("/course/{course_id}", response_model=List[AssessmentResponse])
@router_plural.get("/course/{course_id}", response_model=List[AssessmentResponse])
def get_course_assessments(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return _get_course_assessments_impl(course_id, db, current_user)


def _get_assessment_impl(id: int, db: Session, current_user: User):
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


@router.get("/{id}", response_model=AssessmentResponse)
@router_plural.get("/{id}", response_model=AssessmentResponse)
def get_assessment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return _get_assessment_impl(id, db, current_user)


def _submit_assessment_impl(
    id: int,
    req: AssessmentSubmitRequest,
    db: Session,
    current_user: User,
    raw_body: Optional[bytes] = None
):
    assessment = db.query(Assessment).filter(Assessment.id == id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Check for raw duplicate keys if raw_body is provided
    if raw_body:
        import json
        try:
            raw_text = raw_body.decode("utf-8")
            def detect_duplicate_keys(pairs):
                seen_keys = set()
                for k, v in pairs:
                    k_str = str(k).strip()
                    k_norm = str(int(k_str)) if k_str.isdigit() else k_str
                    if k_norm in seen_keys or k_str in seen_keys:
                        raise HTTPException(status_code=400, detail=f"Duplicate question key in submission: {k}")
                    seen_keys.add(k_norm)
                    seen_keys.add(k_str)
                return dict(pairs)

            raw_data = json.loads(raw_text, object_pairs_hook=detect_duplicate_keys)
            if "answers" in raw_data and isinstance(raw_data["answers"], dict):
                norm_dict_keys = set()
                for k in raw_data["answers"].keys():
                    k_str = str(k).strip()
                    k_norm = str(int(k_str)) if k_str.isdigit() else k_str
                    if k_norm in norm_dict_keys:
                        raise HTTPException(status_code=400, detail=f"Duplicate question key in submission: {k}")
                    norm_dict_keys.add(k_norm)
        except HTTPException:
            raise
        except Exception:
            pass

    # 1. Payload validation & guardrails
    if not req.answers:
        raise HTTPException(status_code=400, detail="Cannot submit 0 answered questions / Answers list cannot be empty")

    answer_items = []
    if isinstance(req.answers, list):
        if len(req.answers) == 0:
            raise HTTPException(status_code=400, detail="Cannot submit 0 answered questions / Answers list cannot be empty")
        for item in req.answers:
            if isinstance(item, dict):
                qid = item.get("question_id")
                opt = item.get("selected_option")
            else:
                qid = getattr(item, "question_id", None)
                opt = getattr(item, "selected_option", None)
            if qid is None:
                raise HTTPException(status_code=400, detail="question_id is required")
            answer_items.append((int(qid), opt))
    elif isinstance(req.answers, dict):
        if len(req.answers) == 0:
            raise HTTPException(status_code=400, detail="Cannot submit 0 answered questions / Answers list cannot be empty")
        for k, v in req.answers.items():
            answer_items.append((int(k), v))
    else:
        raise HTTPException(status_code=400, detail="Invalid answers payload format")

    # Duplicate question_id check
    seen_qids = set()
    for qid, _ in answer_items:
        qid_int = int(qid)
        if qid_int in seen_qids:
            raise HTTPException(status_code=400, detail=f"Duplicate question_id entries in submission: {qid}")
        seen_qids.add(qid_int)

    # 2. Trainee course enrollment check (HTTP 403 if not enrolled)
    if current_user.role == UserRole.TRAINEE:
        is_enrolled = False
        profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == current_user.id).first()
        if profile:
            for batch in profile.enrolled_batches:
                if batch.programme_id == assessment.course_id:
                    is_enrolled = True
                    break
            if not is_enrolled and profile.course_enrolled and assessment.programme:
                p_str = profile.course_enrolled.lower().strip()
                prog_str = assessment.programme.title.lower().strip()
                if p_str in prog_str or prog_str in p_str:
                    is_enrolled = True
        if not is_enrolled:
            raise HTTPException(status_code=403, detail="Trainee is not enrolled in the parent course/batch")

    # 3. Question grading & skill score computation
    skill_stats_by_id: Dict[int, Dict[str, Any]] = {}
    total_marks_possible = 0
    total_marks_earned = 0

    q_map = {q.id: q for q in assessment.questions}

    for q in assessment.questions:
        s_id = q.skill_id
        s_name = q.skill.name if q.skill else f"Skill-{s_id}"

        if s_id not in skill_stats_by_id:
            skill_stats_by_id[s_id] = {
                "skill_id": s_id,
                "skill_name": s_name,
                "marks_obtained": 0,
                "total_marks": 0
            }
        skill_stats_by_id[s_id]["total_marks"] += q.marks
        total_marks_possible += q.marks

    # Process trainee submissions
    stored_answers_dict = {}
    for qid, user_choice in answer_items:
        stored_answers_dict[str(qid)] = user_choice
        q = q_map.get(qid)
        if not q:
            continue

        s_id = q.skill_id
        choice_idx = -1
        if isinstance(user_choice, int):
            choice_idx = user_choice
        elif isinstance(user_choice, str):
            clean = user_choice.strip()
            if clean.isdigit():
                choice_idx = int(clean)
            elif clean.upper() in ["A", "B", "C", "D"]:
                choice_idx = ord(clean.upper()) - ord("A")
            elif q.options and clean in q.options:
                choice_idx = q.options.index(clean)
            elif q.options:
                for idx, opt_str in enumerate(q.options):
                    if opt_str.strip().startswith(f"Option {clean.upper()}") or opt_str.strip().startswith(f"{clean.upper()}:"):
                        choice_idx = idx
                        break

        if choice_idx == q.correct_option:
            skill_stats_by_id[s_id]["marks_obtained"] += q.marks
            total_marks_earned += q.marks

    # MANDATORY INVARIANT: Must include ALL skills tagged in the assessment.
    # If a trainee gets 0 answers correct for a skill, record 0.0 percentage explicitly.
    skill_wise_score_dict: Dict[str, Any] = {}
    for s_id, data in skill_stats_by_id.items():
        s_name = data["skill_name"]
        total_m = data["total_marks"]
        obtained_m = data["marks_obtained"]
        pct = round((obtained_m / total_m * 100), 1) if total_m > 0 else 0.0
        item_data = {
            "skill_id": s_id,
            "skill_name": s_name,
            "marks_obtained": obtained_m,
            "total_marks": total_m,
            "percentage": pct,
            "score": pct
        }
        # Key by skill_name and skill_id string
        skill_wise_score_dict[s_name] = item_data
        skill_wise_score_dict[str(s_id)] = item_data

    overall_pct = round((total_marks_earned / total_marks_possible * 100), 1) if total_marks_possible > 0 else 100.0

    # 4. Retake & Current Attempt Logic:
    # Set is_current = False on all older attempts for this (trainee_id, assessment_id)
    db.query(AssessmentResult).filter(
        AssessmentResult.trainee_id == current_user.id,
        AssessmentResult.assessment_id == assessment.id
    ).update({"is_current": False})
    db.flush()

    # Create new attempt with is_current = True
    result = AssessmentResult(
        trainee_id=current_user.id,
        assessment_id=assessment.id,
        skill_wise_score=skill_wise_score_dict,
        overall_score=overall_pct,
        total_marks_earned=total_marks_earned,
        total_marks_possible=total_marks_possible,
        answers=stored_answers_dict,
        is_current=True,
        submitted_at=datetime.utcnow()
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    # Auto-issue certificate if eligible
    try:
        from app.services.certificate_service import check_and_issue_certificate
        check_and_issue_certificate(current_user.id, assessment.course_id, db, score_threshold=60.0)
    except Exception:
        pass

    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == current_user.id).first()
    trainee_code = profile.trainee_id if profile else f"TR-{current_user.id}"

    return AssessmentSubmitResponse(
        result_id=result.id,
        assessment_id=assessment.id,
        trainee_id=trainee_code,
        overall_score=result.overall_score,
        total_marks_earned=result.total_marks_earned,
        total_marks_possible=result.total_marks_possible,
        skill_wise_score=skill_wise_score_dict,
        submitted_at=result.submitted_at
    )


@router.post("/{id}/submit", response_model=AssessmentSubmitResponse)
@router_plural.post("/{id}/submit", response_model=AssessmentSubmitResponse)
async def submit_assessment(
    id: int,
    request: Request,
    req: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw_body = await request.body()
    return _submit_assessment_impl(id, req, db, current_user, raw_body=raw_body)


def _get_trainee_skill_scores_impl(id: str, db: Session, current_user: User):
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

    # Get only is_current = True results
    results = db.query(AssessmentResult).filter(
        AssessmentResult.trainee_id == target_user.id,
        AssessmentResult.is_current == True
    ).order_by(desc(AssessmentResult.submitted_at)).all()

    latest_skills: Dict[int, SkillScoreItem] = {}

    for res in results:
        scores = res.skill_wise_score or {}
        for k, s_data in scores.items():
            if isinstance(s_data, dict):
                s_id = s_data.get("skill_id")
                if s_id is not None and int(s_id) not in latest_skills:
                    latest_skills[int(s_id)] = SkillScoreItem(
                        skill_id=int(s_id),
                        skill_name=s_data.get("skill_name", f"Skill-{s_id}"),
                        marks_obtained=s_data.get("marks_obtained", 0),
                        total_marks=s_data.get("total_marks", 0),
                        percentage=s_data.get("percentage", 0.0),
                        score=s_data.get("percentage", 0.0)
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
                percentage=0.0,
                score=0.0
            )

    return TraineeSkillScoreSummary(
        trainee_id=trainee_code,
        trainee_name=target_user.name,
        skills=list(latest_skills.values())
    )


@router.get("/trainee/{id}/skill-scores", response_model=TraineeSkillScoreSummary)
@router_plural.get("/trainee/{id}/skill-scores", response_model=TraineeSkillScoreSummary)
def get_trainee_skill_scores(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return _get_trainee_skill_scores_impl(id, db, current_user)
