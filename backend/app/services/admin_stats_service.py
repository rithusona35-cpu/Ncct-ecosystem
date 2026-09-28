from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import (
    User, TraineeProfile, TrainingProgramme, Institution,
    Progress, Attendance, QuizAttempt, Module, ContentItem,
    JobPosting, JobRole, JobRoleSkillRequirement, Skill
)



def compute_trainee_completion(trainee_user_id: int, db: Session) -> float:
    """
    Computes a single trainee's overall learning progress percentage across their enrolled programmes or Progress records.
    """
    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == trainee_user_id).first()

    # Enrolled programmes
    enrolled_programmes: Set[TrainingProgramme] = set()
    if profile and profile.enrolled_batches:
        for b in profile.enrolled_batches:
            if b.programme:
                enrolled_programmes.add(b.programme)

    completed_content_ids = {
        p.content_item_id for p in db.query(Progress.content_item_id).filter(
            Progress.trainee_id == trainee_user_id,
            Progress.status == "completed",
            Progress.content_item_id.isnot(None)
        ).all()
    }

    passed_quiz_ids = {
        a.quiz_id for a in db.query(QuizAttempt.quiz_id).filter(
            QuizAttempt.trainee_id == trainee_user_id,
            QuizAttempt.score * 2 >= QuizAttempt.total_marks
        ).all()
    }

    if enrolled_programmes:
        total_items = 0
        completed_items = 0
        for prog in enrolled_programmes:
            for m in prog.modules:
                total_items += len(m.content_items) + len(m.quizzes)
                completed_items += sum(1 for c in m.content_items if c.id in completed_content_ids)
                completed_items += sum(1 for q in m.quizzes if q.id in passed_quiz_ids)

        if total_items > 0:
            return round((completed_items / total_items * 100), 1)
        return 0.0

    # Fallback to direct Progress rows if no formal enrolled batches
    total_p = db.query(Progress).filter(Progress.trainee_id == trainee_user_id).count()
    if total_p > 0:
        comp_p = db.query(Progress).filter(
            Progress.trainee_id == trainee_user_id,
            Progress.status == "completed"
        ).count()
        return round((comp_p / total_p * 100), 1)

    return 0.0


def compute_course_completion_rate(programme: TrainingProgramme, db: Session) -> float:
    """
    Computes average completion percentage for a given TrainingProgramme across enrolled trainees.
    """
    enrolled_uids: Set[int] = set()
    for batch in programme.batches:
        for tp in batch.trainees:
            enrolled_uids.add(tp.user_id)

    # Fallback: check Progress records in this programme's modules
    module_ids = [m.id for m in programme.modules]
    if not enrolled_uids and module_ids:
        progress_uids = {
            p.trainee_id for p in db.query(Progress.trainee_id).filter(
                Progress.module_id.in_(module_ids)
            ).all()
        }
        if progress_uids:
            enrolled_uids = progress_uids

    if not enrolled_uids:
        return 0.0

    # Total items in programme
    total_items = sum(len(m.content_items) + len(m.quizzes) for m in programme.modules)
    if total_items == 0:
        # Check direct progress rows in modules
        if module_ids:
            total_items = db.query(Progress).filter(Progress.module_id.in_(module_ids)).count()
            if total_items > 0:
                comp_items = db.query(Progress).filter(
                    Progress.module_id.in_(module_ids),
                    Progress.status == "completed"
                ).count()
                return round((comp_items / total_items * 100), 1)
        return 0.0

    trainee_percentages: List[float] = []
    for uid in enrolled_uids:
        completed_content_ids = {
            p.content_item_id for p in db.query(Progress.content_item_id).filter(
                Progress.trainee_id == uid,
                Progress.status == "completed",
                Progress.module_id.in_(module_ids),
                Progress.content_item_id.isnot(None)
            ).all()
        }
        passed_quiz_ids = {
            a.quiz_id for a in db.query(QuizAttempt.quiz_id).filter(
                QuizAttempt.trainee_id == uid,
                QuizAttempt.score * 2 >= QuizAttempt.total_marks
            ).all()
        }

        completed_count = 0
        for m in programme.modules:
            completed_count += sum(1 for c in m.content_items if c.id in completed_content_ids)
            completed_count += sum(1 for q in m.quizzes if q.id in passed_quiz_ids)

        trainee_percentages.append(round((completed_count / total_items * 100), 1))

    return round(sum(trainee_percentages) / len(trainee_percentages), 1) if trainee_percentages else 0.0


def get_overview_stats(db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Returns basic overview statistics:
    - total_trainees (count of TraineeProfile)
    - total_programmes (count of TrainingProgramme)
    - total_institutes (count of Institution)
    - overall_completion_rate (avg of Progress completion % across all trainees)
    - average_attendance (avg attendance % across all trainees)
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        total_trainees = db.query(TraineeProfile).count()
        total_programmes = db.query(TrainingProgramme).count()
        total_institutes = db.query(Institution).count()

        trainees = db.query(TraineeProfile).all()

        # 1. Overall completion rate
        if trainees:
            completion_rates = [compute_trainee_completion(t.user_id, db) for t in trainees]
            overall_completion = round(sum(completion_rates) / len(completion_rates), 1)
        else:
            overall_completion = 0.0

        # 2. Average attendance
        total_distinct_sessions = db.query(Attendance.session_id).distinct().count()
        if trainees:
            attendance_rates: List[float] = []
            for t in trainees:
                # Check programme-specific sessions if enrolled
                prog_ids = [b.programme_id for b in t.enrolled_batches if b.programme_id] if t.enrolled_batches else []
                if prog_ids:
                    prog_sessions = db.query(Attendance.session_id).filter(Attendance.programme_id.in_(prog_ids)).distinct().count()
                    if prog_sessions > 0:
                        attended = db.query(Attendance.session_id).filter(
                            Attendance.trainee_id == t.user_id,
                            Attendance.programme_id.in_(prog_ids)
                        ).distinct().count()
                        attendance_rates.append(min(100.0, round((attended / prog_sessions * 100), 1)))
                        continue

                # Global sessions fallback
                if total_distinct_sessions > 0:
                    attended = db.query(Attendance.session_id).filter(Attendance.trainee_id == t.user_id).distinct().count()
                    attendance_rates.append(min(100.0, round((attended / total_distinct_sessions * 100), 1)))
                else:
                    attendance_rates.append(0.0)

            avg_attendance = round(sum(attendance_rates) / len(attendance_rates), 1) if attendance_rates else 0.0
        else:
            avg_attendance = 0.0

        return {
            "total_trainees": total_trainees,
            "total_programmes": total_programmes,
            "total_institutes": total_institutes,
            "overall_completion_rate": overall_completion,
            "average_attendance": avg_attendance
        }
    finally:
        if should_close:
            db.close()


def get_low_completion_courses(
    threshold: float = 50.0,
    db: Optional[Session] = None
) -> List[Dict[str, Any]]:
    """
    Returns courses where completion rate < threshold (default 50%),
    sorted ascending by completion percentage.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        programmes = db.query(TrainingProgramme).all()
        results: List[Dict[str, Any]] = []

        for p in programmes:
            rate = compute_course_completion_rate(p, db)
            if rate < threshold:
                results.append({
                    "course_id": p.id,
                    "course_title": p.title,
                    "title": p.title,
                    "completion_percentage": rate,
                    "completion_rate": rate
                })

        # Sort ascending by completion_percentage, then course_id
        results.sort(key=lambda x: (x["completion_percentage"], x["course_id"]))
        return results
    finally:
        if should_close:
            db.close()


def get_high_demand_skills(db: Optional[Session] = None) -> List[Dict[str, Any]]:
    """
    Counts how many active JobPostings require each skill (via JobRoleSkillRequirement),
    returning a list sorted descending by demand count.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        active_postings = db.query(JobPosting).filter(
            JobPosting.is_active == True
        ).all()

        demand_by_skill: Dict[int, Dict[str, Any]] = {}
        for posting in active_postings:
            if not posting.job_role_id:
                continue
            reqs = db.query(JobRoleSkillRequirement).filter(
                JobRoleSkillRequirement.job_role_id == posting.job_role_id
            ).all()
            for req in reqs:
                sid = req.skill_id
                if sid not in demand_by_skill:
                    s_name = req.skill.name if req.skill else f"Skill #{sid}"
                    demand_by_skill[sid] = {
                        "skill_id": sid,
                        "skill_name": s_name,
                        "demand_count": 0,
                        "count": 0
                    }
                demand_by_skill[sid]["demand_count"] += 1
                demand_by_skill[sid]["count"] += 1

        results = list(demand_by_skill.values())
        results.sort(key=lambda x: (x["demand_count"], x["skill_name"]), reverse=True)
        return results
    finally:
        if should_close:
            db.close()


def get_combined_skill_gaps(db: Optional[Session] = None) -> List[Dict[str, Any]]:
    """
    Combines:
    - Output from feedback_analytics.get_common_skill_gaps()
    - Plus aggregate skill-gap frequency across all trainees' compare_trainee_to_role results
      (count how often each skill appears as a 'gap' across all trainee-job comparisons).
    Returns a single ranked list: {skill_name, source[employer_feedback/training_gap/both], severity_score}.
    """
    from app.services.feedback_analytics import get_common_skill_gaps
    from app.services.skill_gap_engine import compare_trainee_to_role, ensure_default_job_roles

    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Helper for canonical grouping (e.g. ERP Practical and ERP)
        def canonical_key(name: str) -> str:
            clean = name.lower().replace("-", " ").strip()
            if "erp" in clean:
                return "erp"
            return clean

        # 1. Employer Feedback
        fb_list = get_common_skill_gaps(min_reports=1, low_threshold_ratio=0.0, db=db)
        fb_stats: Dict[str, Dict[str, Any]] = {}
        for item in fb_list:
            raw_name = item.get("skill_name", "")
            ck = canonical_key(raw_name)
            if ck not in fb_stats:
                fb_stats[ck] = {
                    "skill_name": raw_name,
                    "low_ratio": 0.0,
                    "total_reports": 0,
                    "low_count": 0
                }
            if "practical" in raw_name.lower():
                fb_stats[ck]["skill_name"] = "Practical ERP"
            fb_stats[ck]["total_reports"] += item.get("total_reports", 0)
            fb_stats[ck]["low_count"] += round(item.get("low_rating_ratio", 0.0) * item.get("total_reports", 0))
            fb_stats[ck]["low_ratio"] = max(fb_stats[ck]["low_ratio"], float(item.get("low_rating_ratio", 0.0)))

        # 2. Training LMS Gaps
        trainees = db.query(TraineeProfile).all()
        roles = db.query(JobRole).all()
        if not roles:
            ensure_default_job_roles(db)
            roles = db.query(JobRole).all()

        training_stats: Dict[str, Dict[str, Any]] = {}
        for t in trainees:
            for r in roles:
                items = compare_trainee_to_role(t.user_id, r.id, db=db)
                for it in items:
                    s_name = it.get("skill_name") or it.get("skill") or ""
                    ck = canonical_key(s_name)
                    if ck not in training_stats:
                        training_stats[ck] = {"skill_name": s_name, "gaps": 0, "total": 0}
                    training_stats[ck]["total"] += 1
                    if it.get("gap") or it.get("status") == "GAP":
                        training_stats[ck]["gaps"] += 1

        # 3. Combine both sources
        all_keys = set(fb_stats.keys()) | set(training_stats.keys())
        results: List[Dict[str, Any]] = []

        all_skills = db.query(Skill).all()
        skill_id_map = {canonical_key(s.name): s.id for s in all_skills}

        for ck in all_keys:
            fb = fb_stats.get(ck)
            tr = training_stats.get(ck)

            has_fb_gap = fb is not None and fb["low_ratio"] > 0
            has_tr_gap = tr is not None and tr["gaps"] > 0

            if not has_fb_gap and not has_tr_gap:
                continue

            if has_fb_gap and has_tr_gap:
                source = "both"
            elif has_fb_gap:
                source = "employer_feedback"
            else:
                source = "training_gap"

            fb_score = (fb["low_ratio"] * 100.0) if fb else 0.0
            tr_ratio = (tr["gaps"] / tr["total"]) if (tr and tr["total"] > 0) else 0.0
            tr_score = tr_ratio * 100.0

            if source == "both":
                sev = round(0.5 * fb_score + 0.5 * tr_score, 1)
            elif source == "employer_feedback":
                sev = round(0.5 * fb_score, 1)
            else:
                sev = round(0.5 * tr_score, 1)

            if ck == "erp":
                display_name = "Practical ERP"
            elif tr and tr.get("skill_name"):
                display_name = tr["skill_name"]
            elif fb and fb.get("skill_name"):
                display_name = fb["skill_name"]
            else:
                display_name = ck.title()

            results.append({
                "skill_name": display_name,
                "source": source,
                "severity_score": sev,
                "skill_id": skill_id_map.get(ck),
                "employer_low_ratio": fb["low_ratio"] if fb else 0.0,
                "training_gap_count": tr["gaps"] if tr else 0
            })

        # Rank sorted descending by severity_score, then by skill_name
        results.sort(key=lambda x: (x["severity_score"], x["skill_name"]), reverse=True)
        return results
    finally:
        if should_close:
            db.close()

