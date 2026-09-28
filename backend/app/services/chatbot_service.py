import os
import sys
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import User, TraineeProfile, JobRole, JobPosting, Certificate
from app.routers.attendance import get_trainee_attendance
from app.routers.lms import get_trainee_progress
from app.routers.courses import get_my_enrolled_courses
from app.services.skill_gap_engine import compare_trainee_to_role, ensure_default_job_roles
from app.services.certificate_service import evaluate_all_for_trainee

logger = logging.getLogger("ncct_chatbot_service")

# Setup path to import ai-engine modules
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_ENGINE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "..", "ai-engine"))
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

try:
    from query import query_knowledge_base
    from gemini_client import generate_ncct_response
except Exception as e:
    logger.warning(f"Could not import from ai-engine: {e}")
    query_knowledge_base = None
    generate_ncct_response = None


def classify_intent(message: str) -> str:
    """
    Keyword-based intent classifier.
    Detects intents according to NCCT chatbot specification:
    - 'attendance' -> progress_query
    - 'complete', 'progress' -> progress_query
    - 'skill', 'gap', 'missing' -> skill_gap_query
    - 'job', 'career' -> career_query
    - 'certificate' -> certificate_query
    - 'class', 'schedule', 'next' -> training_schedule_query
    - 'explain', 'what is', 'how does' -> learning_question
    - default -> general_chat
    """
    if not message:
        return "general_chat"

    text = message.lower().strip()

    # Domain user data intents take priority when referring to user data
    if any(k in text for k in ["attendance", "complete", "progress"]):
        return "progress_query"

    if any(k in text for k in ["skill", "gap", "missing"]):
        return "skill_gap_query"

    if any(k in text for k in ["job", "career"]):
        return "career_query"

    if "certificate" in text:
        return "certificate_query"

    if any(k in text for k in ["class", "schedule", "next"]):
        return "training_schedule_query"

    # Educational RAG intent for conceptual and policy inquiries
    if any(k in text for k in ["explain", "what is", "how does"]):
        return "learning_question"

    return "general_chat"


def handle_progress_query(user: User, db: Session) -> str:
    """
    Retrieves trainee attendance and course completion progress directly
    from existing backend services.
    """
    attendance_pct_str = "0%"
    try:
        att_summary = get_trainee_attendance(id=str(user.id), db=db, current_user=user)
        pct = att_summary.attendance_percentage
        attendance_pct_str = f"{int(pct)}%" if pct.is_integer() else f"{pct}%"
    except Exception:
        attendance_pct_str = "0%"

    total_modules = 0
    completed_modules = 0
    try:
        courses_prog = get_trainee_progress(trainee_id=str(user.id), db=db, current_user=user)
        for cp in courses_prog:
            for mod in cp.modules:
                total_modules += 1
                if mod.completed_items >= mod.total_items and mod.total_items > 0:
                    completed_modules += 1
    except Exception:
        pass

    if total_modules > 0:
        return f"Your attendance is {attendance_pct_str}. You have completed {completed_modules} of {total_modules} modules."
    return f"Your attendance is {attendance_pct_str}."


def handle_skill_gap_query(user: User, db: Session) -> str:
    """
    Compares trainee competencies against target job roles via skill_gap_engine.
    """
    ensure_default_job_roles(db)
    roles = db.query(JobRole).all()
    if not roles:
        return "No job role competency standards found in the system."

    target_role = roles[0]
    comparisons = compare_trainee_to_role(user.id, target_role.id, db)
    gaps = [c for c in comparisons if c.get("gap") is True]
    matched = [c for c in comparisons if c.get("gap") is False]

    if gaps:
        gap_names = ", ".join([g["skill_name"] for g in gaps])
        matched_names = ", ".join([m["skill_name"] for m in matched]) if matched else "None"
        return (
            f"Skill Gap Analysis for '{target_role.title}': You have {len(gaps)} skill gap(s): {gap_names}. "
            f"Matched skills: {matched_names}."
        )
    return f"Skill Gap Analysis for '{target_role.title}': All {len(matched)} required skills are satisfied! No gaps identified."


def handle_career_query(user: User, db: Session) -> str:
    """
    Retrieves active job postings and employer opportunities.
    """
    postings = db.query(JobPosting).filter(JobPosting.is_active == True).all()
    if postings:
        job_titles = [f"{p.title} at {p.employer.name if p.employer else 'NCCT Cooperative'}" for p in postings[:3]]
        return f"There are {len(postings)} active job posting(s) available: {'; '.join(job_titles)}."
    return "There are currently no active job postings matching your profile."


def handle_certificate_query(user: User, db: Session) -> str:
    """
    Evaluates and retrieves issued certificates for the trainee.
    """
    try:
        certs = evaluate_all_for_trainee(user.id, db)
        if certs:
            cert_titles = [f"{c.programme.title if c.programme else 'Certified Programme'} (ID: {c.certificate_id})" for c in certs]
            return f"You have {len(certs)} issued certificate(s): {', '.join(cert_titles)}."
    except Exception:
        pass
    return "You do not have any issued certificates yet. Maintain at least 75% attendance and passing scores on all assessments to earn your certificate."


def handle_training_schedule_query(user: User, db: Session) -> str:
    """
    Retrieves the trainee's enrolled courses and upcoming session schedule.
    """
    def _format_date(val: Any) -> str:
        if not val:
            return "TBD"
        if hasattr(val, "strftime"):
            return val.strftime("%Y-%m-%d")
        return str(val)[:10]

    try:
        enrolled = get_my_enrolled_courses(db, user)
        if enrolled:
            items = []
            for c in enrolled:
                s_date = _format_date(c.start_date)
                e_date = _format_date(c.end_date)
                items.append(f"{c.title} (Batch: {c.batch_name}, Dates: {s_date} to {e_date})")
            return f"Your training schedule: {'; '.join(items)}."
    except Exception:
        pass
    return "You have no upcoming training sessions or enrolled batches scheduled."


def handle_learning_question(user_message: str) -> str:
    """
    Retrieves top knowledge chunks from persistent ChromaDB collection.
    """
    if query_knowledge_base is None:
        return "Knowledge base search module is currently unavailable."

    try:
        results = query_knowledge_base(query_text=user_message, n_results=3)
        if not results:
            return "No matching educational content found in the NCCT knowledge base."

        chunks = []
        for r in results:
            source = r.get("source", "knowledge-base")
            title = r.get("title", "")
            doc = r.get("document", "").strip()
            chunks.append(f"--- Document: {title} ({source}) ---\n{doc}")

        return "\n\n".join(chunks)
    except Exception as e:
        logger.error(f"Error executing ChromaDB query: {e}")
        return f"Error retrieving knowledge base content: {e}"


def handle_general_chat(user: User, db: Session) -> str:
    """
    Default fallback for non-intent general queries.
    """
    name = user.name or "Trainee"
    return (
        f"Hello {name}! I am your NCCT AI assistant. You can ask me about your attendance, "
        "course progress, skill gaps, career and job opportunities, certificates, training schedule, "
        "or questions about cooperative principles and policies."
    )


def process_chatbot_message(message: str, current_user: User, db: Session) -> Dict[str, Any]:
    """
    Main entry point:
    1. Classifies intent.
    2. Collects backend database context or RAG chunks from ChromaDB.
    3. Detects trainee preferred language.
    4. Calls Gemini in a try/except. On failure, timeout, or FALLBACK_MODE=true in env,
       falls back to the simple rule-based responder that returns the raw backend data,
       plus is_fallback: true.
    """
    intent = classify_intent(message)

    # 1. Resolve Trainee Preferred Language
    preferred_language = "English"
    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == current_user.id).first()
    if profile and profile.preferred_language:
        preferred_language = profile.preferred_language

    # 2. Gather Grounding Context (Raw Backend Data or RAG chunks)
    if intent == "progress_query":
        raw_context = handle_progress_query(current_user, db)
    elif intent == "skill_gap_query":
        raw_context = handle_skill_gap_query(current_user, db)
    elif intent == "career_query":
        raw_context = handle_career_query(current_user, db)
    elif intent == "certificate_query":
        raw_context = handle_certificate_query(current_user, db)
    elif intent == "training_schedule_query":
        raw_context = handle_training_schedule_query(current_user, db)
    elif intent == "learning_question":
        raw_context = handle_learning_question(message)
    else:
        raw_context = handle_general_chat(current_user, db)

    # 3. Check environment for forced fallback mode (dynamically refresh .env)
    try:
        from dotenv import load_dotenv
        for p in [
            os.path.join(CURRENT_DIR, "..", "..", ".env"),
            os.path.join(CURRENT_DIR, "..", "..", "..", ".env"),
        ]:
            if os.path.exists(p):
                load_dotenv(p, override=False)
    except Exception:
        pass

    forced_fallback = os.getenv("FALLBACK_MODE", "").strip().lower() in ["true", "1", "yes"]

    is_fallback = False
    final_response = raw_context

    if forced_fallback:
        logger.info("FALLBACK_MODE=true detected. Returning raw backend data with is_fallback=True.")
        final_response = raw_context
        is_fallback = True
    else:
        if generate_ncct_response is not None:
            try:
                final_response = generate_ncct_response(
                    user_message=message,
                    context=raw_context,
                    intent=intent,
                    language=preferred_language
                )
                is_fallback = False
            except Exception as e:
                logger.warning(f"Gemini call failed ({e}). Reverting to rule-based fallback response.")
                final_response = raw_context
                is_fallback = True
        else:
            final_response = raw_context
            is_fallback = True

    return {
        "intent": intent,
        "response": final_response,
        "is_fallback": is_fallback
    }
