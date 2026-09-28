from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    User, UserRole, TraineeProfile, TrainingProgramme,
    Module, ContentItem, Quiz, Question, QuizAttempt, Progress
)
from app.schemas import (
    QuizCreate, QuizResponse, QuestionCreate, QuestionPublic,
    QuizSubmitRequest, QuizSubmitResponse, QuestionResult,
    MarkCompleteRequest, ProgressItemResponse,
    ModuleContentStatusResponse, ContentItemWithStatus, QuizWithStatus,
    CourseProgressResponse, ModuleProgressSummary
)
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/lms", tags=["LMS Learning & Quiz Engine"])


def seed_sample_quiz_if_needed(db: Session, module: Module):
    """
    Ensure module has at least one default quiz with 3 cooperative accounting questions.
    """
    if len(module.quizzes) > 0:
        return module.quizzes[0]

    quiz = Quiz(
        module_id=module.id,
        title=f"Knowledge Check: {module.title}"
    )
    db.add(quiz)
    db.flush()

    q1 = Question(
        quiz_id=quiz.id,
        text="Under double-entry bookkeeping for cooperatives, how is a member share capital contribution recorded?",
        options=[
            "Debit Cash/Bank, Credit Member Share Capital",
            "Debit Member Share Capital, Credit Cash/Bank",
            "Debit Reserve Fund, Credit Cash",
            "Debit Operational Expense, Credit Member Revenue"
        ],
        correct_option=0,
        marks=5
    )
    q2 = Question(
        quiz_id=quiz.id,
        text="Which statutory reserve is mandatory for cooperative societies to maintain from net profits in India?",
        options=[
            "Discretionary Entertainment Reserve",
            "Statutory Reserve Fund (at least 25% of net profit)",
            "Dividend Equalization Fund only",
            "Commercial Speculation Reserve"
        ],
        correct_option=1,
        marks=5
    )
    q3 = Question(
        quiz_id=quiz.id,
        text="What is the primary objective of a Cooperative Society Audit under NCCT guidelines?",
        options=[
            "To maximize corporate tax liabilities",
            "To verify financial accuracy, member equity protection, and cooperative principle adherence",
            "To completely eliminate community dividends",
            "To evaluate consumer retail advertisements"
        ],
        correct_option=1,
        marks=5
    )
    db.add_all([q1, q2, q3])
    db.commit()
    db.refresh(quiz)
    return quiz


@router.get("/module/{id}/content", response_model=ModuleContentStatusResponse)
def get_module_content(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns module information, all content items with completion progress status for current trainee,
    and associated quizzes with previous attempt scores.
    """
    module = db.query(Module).filter(Module.id == id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    programme = module.programme
    if not programme:
        raise HTTPException(status_code=404, detail="Associated training programme not found")

    # Seed sample quiz for first module if none exist
    if len(module.quizzes) == 0:
        seed_sample_quiz_if_needed(db, module)
        db.refresh(module)

    # Get progress for this user across module content items
    progress_records = db.query(Progress).filter(
        Progress.trainee_id == current_user.id,
        Progress.module_id == module.id
    ).all()
    progress_by_item = {p.content_item_id: p for p in progress_records if p.content_item_id is not None}

    content_items_res: List[ContentItemWithStatus] = []
    for item in module.content_items:
        prog = progress_by_item.get(item.id)
        content_items_res.append(ContentItemWithStatus(
            id=item.id,
            module_id=item.module_id,
            type=item.type,
            title=item.title,
            url_or_file_path=item.url_or_file_path,
            url=getattr(item, "url", None) or item.url_or_file_path,
            order=item.order,
            created_at=item.created_at,
            status=prog.status if prog else "not_started",
            completed_at=prog.completed_at if prog else None
        ))

    # Quizzes for this module
    quizzes_res: List[QuizWithStatus] = []
    for qz in module.quizzes:
        total_q = len(qz.questions)
        total_m = sum(q.marks for q in qz.questions)
        
        # User attempts
        user_attempts = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == qz.id,
            QuizAttempt.trainee_id == current_user.id
        ).order_by(QuizAttempt.submitted_at.desc()).all()

        best_score = max([a.score for a in user_attempts]) if user_attempts else None
        best_pct = (best_score / total_m * 100.0) if (best_score is not None and total_m > 0) else None
        is_completed = (best_pct >= 50.0) if best_pct is not None else False
        last_attempt = user_attempts[0].submitted_at if user_attempts else None

        quizzes_res.append(QuizWithStatus(
            id=qz.id,
            module_id=qz.module_id,
            title=qz.title,
            total_questions=total_q,
            total_marks=total_m,
            is_completed=is_completed,
            best_score=best_score,
            best_percentage=round(best_pct, 1) if best_pct is not None else None,
            last_attempt_at=last_attempt
        ))

    return ModuleContentStatusResponse(
        module_id=module.id,
        module_title=module.title,
        programme_id=programme.id,
        programme_title=programme.title,
        content_items=content_items_res,
        quizzes=quizzes_res
    )


@router.post("/progress/mark-complete", response_model=ProgressItemResponse)
def mark_content_complete(
    req: MarkCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a content item as completed by the current trainee.
    """
    content_item = db.query(ContentItem).filter(ContentItem.id == req.content_item_id).first()
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")

    module_id = req.module_id or content_item.module_id

    progress = db.query(Progress).filter(
        Progress.trainee_id == current_user.id,
        Progress.content_item_id == req.content_item_id
    ).first()

    now = datetime.utcnow()
    if progress:
        progress.status = "completed"
        progress.completed_at = now
    else:
        progress = Progress(
            trainee_id=current_user.id,
            module_id=module_id,
            content_item_id=req.content_item_id,
            status="completed",
            completed_at=now
        )
        db.add(progress)

    db.commit()
    db.refresh(progress)

    # Auto-issue certificate if all modules are now completed and assessment is passed
    try:
        mod = db.query(Module).filter(Module.id == module_id).first()
        if mod and mod.programme_id:
            from app.services.certificate_service import check_and_issue_certificate
            check_and_issue_certificate(current_user.id, mod.programme_id, db, score_threshold=60.0)
    except Exception:
        pass

    return ProgressItemResponse(
        id=progress.id,
        trainee_id=progress.trainee_id,
        module_id=progress.module_id,
        content_item_id=progress.content_item_id,
        status=progress.status,
        completed_at=progress.completed_at
    )


@router.get("/quiz/{id}", response_model=QuizResponse)
def get_quiz(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns quiz details and question set.
    For security and integrity, correct_option is omitted from public response.
    """
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions_res = [
        QuestionPublic(
            id=q.id,
            quiz_id=q.quiz_id,
            text=q.text,
            options=q.options,
            marks=q.marks
        ) for q in quiz.questions
    ]

    return QuizResponse(
        id=quiz.id,
        module_id=quiz.module_id,
        title=quiz.title,
        created_at=quiz.created_at,
        questions=questions_res
    )


@router.post("/quiz/{id}/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    id: int,
    req: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Auto-grades submitted MCQ quiz answers, stores attempt, and records module progress.
    """
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    total_marks = 0
    score = 0
    question_results: List[QuestionResult] = []

    for q in quiz.questions:
        total_marks += q.marks
        user_choice = req.answers.get(str(q.id))
        if user_choice is None:
            user_choice = req.answers.get(int(q.id))

        is_correct = False
        if user_choice is not None:
            try:
                is_correct = int(user_choice) == int(q.correct_option)
            except (ValueError, TypeError):
                is_correct = False

        marks_earned = q.marks if is_correct else 0
        score += marks_earned

        question_results.append(QuestionResult(
            question_id=q.id,
            text=q.text,
            selected_option=int(user_choice) if user_choice is not None else None,
            correct_option=q.correct_option,
            is_correct=is_correct,
            marks_earned=marks_earned,
            marks_possible=q.marks
        ))

    pct = (score / total_marks * 100.0) if total_marks > 0 else 100.0
    passed = pct >= 50.0

    attempt = QuizAttempt(
        trainee_id=current_user.id,
        quiz_id=quiz.id,
        score=score,
        total_marks=total_marks,
        answers=req.answers,
        submitted_at=datetime.utcnow()
    )
    db.add(attempt)

    # If passed, register progress for this quiz
    if passed:
        existing_prog = db.query(Progress).filter(
            Progress.trainee_id == current_user.id,
            Progress.module_id == quiz.module_id,
            Progress.content_item_id == None
        ).first()

        now = datetime.utcnow()
        if existing_prog:
            existing_prog.status = "completed"
            existing_prog.completed_at = now
        else:
            db.add(Progress(
                trainee_id=current_user.id,
                module_id=quiz.module_id,
                content_item_id=None,
                status="completed",
                completed_at=now
            ))

    db.commit()
    db.refresh(attempt)

    return QuizSubmitResponse(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        score=score,
        total_marks=total_marks,
        percentage=round(pct, 1),
        passed=passed,
        submitted_at=attempt.submitted_at,
        question_results=question_results
    )


@router.get("/progress/{trainee_id}", response_model=List[CourseProgressResponse])
def get_trainee_progress(
    trainee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns overall % completion per enrolled course for the trainee.
    Supports querying by 'me', integer user id, or Trainee ID string (NCCT-TR-2026-00001).
    """
    target_user: Optional[User] = None
    if trainee_id == "me":
        target_user = current_user
    elif trainee_id.isdigit():
        target_user = db.query(User).filter(User.id == int(trainee_id)).first()
    else:
        profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == trainee_id).first()
        if profile:
            target_user = profile.user

    if not target_user:
        raise HTTPException(status_code=404, detail=f"Trainee '{trainee_id}' not found")

    # Access control: Trainee can only view own progress unless Trainer/Admin
    if current_user.role == UserRole.TRAINEE and current_user.id != target_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view other trainees' progress")

    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == target_user.id).first()
    if not profile or not profile.enrolled_batches:
        return []

    course_progress_list: List[CourseProgressResponse] = []
    seen_programmes = set()

    for batch in profile.enrolled_batches:
        programme = batch.programme
        if not programme or programme.id in seen_programmes:
            continue
        seen_programmes.add(programme.id)

        modules_summary: List[ModuleProgressSummary] = []
        course_total_items = 0
        course_completed_items = 0

        for module in programme.modules:
            # Seed quiz if needed
            if len(module.quizzes) == 0:
                seed_sample_quiz_if_needed(db, module)
                db.refresh(module)

            content_count = len(module.content_items)
            quiz_count = len(module.quizzes)
            module_total = content_count + quiz_count

            # Completed content items in this module
            completed_content_ids = db.query(Progress.content_item_id).filter(
                Progress.trainee_id == target_user.id,
                Progress.module_id == module.id,
                Progress.status == "completed",
                Progress.content_item_id.isnot(None)
            ).all()
            completed_content_set = {c[0] for c in completed_content_ids}
            completed_content_count = sum(1 for c in module.content_items if c.id in completed_content_set)

            # Passed quizzes in this module
            passed_quizzes_count = 0
            for qz in module.quizzes:
                # Check if user has an attempt with score >= 50%
                passed_attempt = db.query(QuizAttempt).filter(
                    QuizAttempt.quiz_id == qz.id,
                    QuizAttempt.trainee_id == target_user.id,
                    (QuizAttempt.score * 2) >= QuizAttempt.total_marks
                ).first()
                if passed_attempt:
                    passed_quizzes_count += 1

            module_completed = completed_content_count + passed_quizzes_count
            module_pct = round((module_completed / module_total * 100)) if module_total > 0 else 0

            course_total_items += module_total
            course_completed_items += module_completed

            modules_summary.append(ModuleProgressSummary(
                module_id=module.id,
                title=module.title,
                total_items=module_total,
                completed_items=module_completed,
                completion_percentage=module_pct
            ))

        course_pct = round((course_completed_items / course_total_items * 100)) if course_total_items > 0 else 0

        course_progress_list.append(CourseProgressResponse(
            programme_id=programme.id,
            batch_id=batch.id,
            batch_name=batch.batch_name,
            programme_title=programme.title,
            total_items=course_total_items,
            completed_items=course_completed_items,
            completion_percentage=course_pct,
            modules=modules_summary
        ))

    return course_progress_list


# Trainer endpoints for quiz management
@router.post("/trainer/modules/{id}/quizzes", response_model=QuizResponse)
def create_quiz_for_module(
    id: int,
    req: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["TRAINER", "ADMIN"]))
):
    """
    Allows trainers to author a new Quiz with multiple questions for a module.
    """
    module = db.query(Module).filter(Module.id == id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    quiz = Quiz(
        module_id=module.id,
        title=req.title
    )
    db.add(quiz)
    db.flush()

    questions_res: List[QuestionPublic] = []
    if req.questions:
        for q_in in req.questions:
            q = Question(
                quiz_id=quiz.id,
                text=q_in.text,
                options=q_in.options,
                correct_option=q_in.correct_option,
                marks=q_in.marks
            )
            db.add(q)
            db.flush()
            questions_res.append(QuestionPublic(
                id=q.id,
                quiz_id=q.quiz_id,
                text=q.text,
                options=q.options,
                marks=q.marks
            ))

    db.commit()
    db.refresh(quiz)

    return QuizResponse(
        id=quiz.id,
        module_id=quiz.module_id,
        title=quiz.title,
        created_at=quiz.created_at,
        questions=questions_res
    )
