from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import EmployerFeedback, Skill, FeedbackRating


def get_common_skill_gaps(
    min_reports: int = 3,
    low_threshold_ratio: float = 0.5,
    db: Optional[Session] = None
) -> List[Dict[str, Any]]:
    """
    Surfaces common industry skill gaps from employer feedback:
    - Group all EmployerFeedback rows by skill_id.
    - For each skill with >= min_reports total feedback entries, calculate the 
      ratio of LOW ratings to total ratings for that skill.
    - Return a ranked list of {skill_name, total_reports, low_rating_ratio, flagged: bool} 
      where flagged=True if low_rating_ratio >= low_threshold_ratio.
    - Sorted by low_rating_ratio descending.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Fetch all feedback with associated skill
        feedbacks = db.query(EmployerFeedback).join(Skill, EmployerFeedback.skill_id == Skill.id).all()

        # Group by skill_id
        skill_stats: Dict[int, Dict[str, Any]] = {}
        for fb in feedbacks:
            s_id = fb.skill_id
            if s_id not in skill_stats:
                s_name = fb.skill.name if fb.skill else f"Skill #{s_id}"
                skill_stats[s_id] = {
                    "skill_name": s_name,
                    "total_reports": 0,
                    "low_count": 0
                }
            skill_stats[s_id]["total_reports"] += 1

            r_str = fb.rating.value if hasattr(fb.rating, "value") else str(fb.rating)
            if r_str.upper() == "LOW" or fb.rating == FeedbackRating.LOW:
                skill_stats[s_id]["low_count"] += 1

        results: List[Dict[str, Any]] = []
        for s_id, data in skill_stats.items():
            total = data["total_reports"]
            if total >= min_reports:
                low_cnt = data["low_count"]
                ratio = round(low_cnt / total, 3) if total > 0 else 0.0
                is_flagged = bool(ratio >= low_threshold_ratio)
                results.append({
                    "skill_name": data["skill_name"],
                    "total_reports": total,
                    "low_rating_ratio": ratio,
                    "flagged": is_flagged
                })

        # Sort by low_rating_ratio descending, then total_reports descending
        results.sort(key=lambda x: (x["low_rating_ratio"], x["total_reports"]), reverse=True)
        return results

    finally:
        if should_close:
            db.close()
