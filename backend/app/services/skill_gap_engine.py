from typing import List, Dict, Any, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from app.database import SessionLocal
from app.models import (
    User, TraineeProfile, Skill, JobRole, JobRoleSkillRequirement,
    AssessmentResult, Module, TrainingProgramme, ContentItem
)

# Standard numeric threshold mappings for required competence levels
REQUIRED_LEVEL_THRESHOLDS: Dict[str, float] = {
    "HIGH": 70.0,
    "MEDIUM": 60.0,
    "LOW": 40.0,
}


def ensure_default_job_roles(db: Session) -> List[JobRole]:
    """
    Seeds standard NCCT ecosystem Job Roles, their required skill competency levels,
    and tags existing curriculum modules with their primary skill IDs.
    """
    # 1. Ensure core skills exist
    skill_names = {
        "Accounting": ("Finance & Accounts", 1),
        "ERP": ("Enterprise Systems", 2),
        "GST": ("Taxation & Compliance", 3),
        "Communication": ("Professional Skills", 4),
        "Cooperative Law": ("Legal & Governance", 5),
    }
    skill_map: Dict[str, Skill] = {}
    for s_name, (cat, _) in skill_names.items():
        s_obj = db.query(Skill).filter(Skill.name == s_name).first()
        if not s_obj:
            s_obj = Skill(name=s_name, category=cat)
            db.add(s_obj)
            db.flush()
        skill_map[s_name] = s_obj

    # 2. Tag curriculum modules with skill_ids if not already set
    modules = db.query(Module).all()
    for m in modules:
        title_lower = m.title.lower()
        if not m.skill_id:
            if "accounting" in title_lower:
                m.skill_id = skill_map["Accounting"].id
            elif "erp" in title_lower or "tally" in title_lower:
                m.skill_id = skill_map["ERP"].id
            elif "gst" in title_lower or "tax" in title_lower:
                m.skill_id = skill_map["GST"].id
            elif "law" in title_lower or "audit" in title_lower:
                m.skill_id = skill_map["Cooperative Law"].id
            elif "communication" in title_lower:
                m.skill_id = skill_map["Communication"].id

    # 3. Ensure a GST module exists in at least one programme for GST gap recommendations
    gst_mod = db.query(Module).filter(Module.skill_id == skill_map["GST"].id).first()
    if not gst_mod:
        first_prog = db.query(TrainingProgramme).first()
        if first_prog:
            next_order = (db.query(Module).filter(Module.programme_id == first_prog.id).count()) + 1
            gst_mod = Module(
                programme_id=first_prog.id,
                title="Module 3: GST Compliance & Cooperative Taxation Procedures",
                order=next_order,
                skill_id=skill_map["GST"].id,
                created_at=datetime.utcnow()
            )
            db.add(gst_mod)
            db.flush()

            # Add sample content item
            c_item = ContentItem(
                module_id=gst_mod.id,
                type="pdf",
                title="GST-Handbook-for-Cooperative-Societies.pdf",
                url_or_file_path="/uploads/GST-Handbook-for-Cooperative-Societies.pdf",
                order=1
            )
            db.add(c_item)

    # 4. Seed Standard Job Roles with skill requirements
    job_roles_spec = [
        {
            "title": "Cooperative Accountant",
            "description": "Responsible for maintenance of society accounts, audit compliance, financial reporting, and cooperative statutory records.",
            "requirements": [
                ("Accounting", "HIGH"),    # Threshold: 70.0% -> Trainee 88% is MATCHED
                ("ERP", "MEDIUM"),         # Threshold: 60.0% -> Trainee 52% is GAP
                ("GST", "MEDIUM"),         # Threshold: 60.0% -> Trainee 48% is GAP
            ]
        },
        {
            "title": "PACS General Manager",
            "description": "Overall administration of Primary Agricultural Credit Societies, credit disbursement, governance, and business expansion.",
            "requirements": [
                ("Cooperative Law", "HIGH"),
                ("Accounting", "MEDIUM"),
                ("ERP", "MEDIUM"),
                ("Communication", "HIGH"),
            ]
        },
        {
            "title": "Cooperative Audit & Compliance Officer",
            "description": "Conducts statutory audits, ensures adherence to state cooperative societies acts, GST filing, and financial reconciliations.",
            "requirements": [
                ("Accounting", "HIGH"),
                ("GST", "HIGH"),
                ("Cooperative Law", "HIGH"),
            ]
        }
    ]

    for role_data in job_roles_spec:
        role = db.query(JobRole).filter(JobRole.title == role_data["title"]).first()
        if not role:
            role = JobRole(
                title=role_data["title"],
                description=role_data["description"],
                created_at=datetime.utcnow()
            )
            db.add(role)
            db.flush()

            for s_name, req_level in role_data["requirements"]:
                if s_name in skill_map:
                    req = JobRoleSkillRequirement(
                        job_role_id=role.id,
                        skill_id=skill_map[s_name].id,
                        required_level=req_level
                    )
                    db.add(req)

    db.commit()
    return db.query(JobRole).all()


def resolve_trainee_user(trainee_id: Union[int, str], db: Session) -> Optional[User]:
    """
    Resolves trainee identifier (numeric User.id, TraineeProfile.trainee_id, or 'me').
    """
    if isinstance(trainee_id, int):
        return db.query(User).filter(User.id == trainee_id).first()
    
    tid_str = str(trainee_id).strip()
    if tid_str.isdigit():
        return db.query(User).filter(User.id == int(tid_str)).first()
    
    profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == tid_str).first()
    if profile and profile.user:
        return profile.user
    
    return None


def get_trainee_skill_scores(trainee_id: Union[int, str], db: Session) -> Dict[str, Dict[str, Any]]:
    """
    Fetches latest skill percentage scores for a trainee from AssessmentResult records.
    Returns mapping: normalized skill name -> { 'skill_id': id, 'skill_name': str, 'percentage': float }
    """
    user = resolve_trainee_user(trainee_id, db)
    if not user:
        return {}

    # Get results ordered latest first
    results = db.query(AssessmentResult).filter(
        AssessmentResult.trainee_id == user.id
    ).order_by(desc(AssessmentResult.submitted_at)).all()

    scores_by_name: Dict[str, Dict[str, Any]] = {}

    for res in results:
        scores = res.skill_wise_score or {}
        for _, s_data in scores.items():
            s_name = s_data.get("skill_name")
            if s_name and s_name.lower() not in scores_by_name:
                scores_by_name[s_name.lower()] = {
                    "skill_id": s_data.get("skill_id"),
                    "skill_name": s_name,
                    "percentage": float(s_data.get("percentage", 0.0)),
                    "marks_obtained": s_data.get("marks_obtained", 0),
                    "total_marks": s_data.get("total_marks", 0),
                }

    return scores_by_name


def compare_trainee_to_role(
    trainee_id: Union[int, str],
    job_role_id: int,
    db: Optional[Session] = None
) -> List[Dict[str, Any]]:
    """
    Compares a trainee's current evaluated skill levels against the skill requirements
    of a target JobRole.
    
    Returns list of:
      {
        "skill_id": int,
        "skill": str,
        "skill_name": str,
        "trainee_level": float,
        "required_level": str,
        "required_threshold": float,
        "gap": bool,
        "gap_percentage": float,
        "status": "GAP" | "MATCHED"
      }
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        ensure_default_job_roles(db)
        role = db.query(JobRole).filter(JobRole.id == job_role_id).first()
        if not role:
            # Fallback by title if id might be 1-indexed
            role = db.query(JobRole).first()
            if not role:
                return []

        trainee_scores = get_trainee_skill_scores(trainee_id, db)
        comparisons: List[Dict[str, Any]] = []

        for req in role.requirements:
            s = req.skill
            if not s:
                continue

            req_level_str = req.required_level.upper()
            threshold = REQUIRED_LEVEL_THRESHOLDS.get(req_level_str, 60.0)

            # Look up trainee score for this skill
            trainee_skill_info = trainee_scores.get(s.name.lower())
            if trainee_skill_info is not None:
                trainee_level = float(trainee_skill_info["percentage"])
            else:
                trainee_level = 0.0

            is_gap = trainee_level < threshold
            gap_pct = max(0.0, round(threshold - trainee_level, 1)) if is_gap else 0.0

            comparisons.append({
                "skill_id": s.id,
                "skill": s.name,
                "skill_name": s.name,
                "trainee_level": trainee_level,
                "required_level": req.required_level,
                "required_threshold": threshold,
                "gap": is_gap,
                "gap_percentage": gap_pct,
                "status": "GAP" if is_gap else "MATCHED",
            })

        return comparisons
    finally:
        if should_close:
            db.close()


def get_recommended_modules(
    gaps: Union[List[Dict[str, Any]], List[str], List[int]],
    trainee_id: Optional[Union[int, str]] = None,
    db: Optional[Session] = None
) -> List[Dict[str, Any]]:
    """
    Looks up curriculum Modules and ContentItems tagged with identified gap skills,
    returning concrete learning recommendations like:
    "Complete ERP Module: PACS Digital ERP Operations & Tally Prime Integration".
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        ensure_default_job_roles(db)
        recommendations: List[Dict[str, Any]] = []

        # Extract target skills to recommend
        target_skills: List[Dict[str, Any]] = []

        for item in gaps:
            if isinstance(item, dict):
                # Filter to gaps only if gap flag is present
                if item.get("gap") is not False:
                    target_skills.append({
                        "skill_id": item.get("skill_id"),
                        "skill_name": item.get("skill") or item.get("skill_name"),
                        "gap_percentage": item.get("gap_percentage", 0.0),
                    })
            elif isinstance(item, int):
                s = db.query(Skill).filter(Skill.id == item).first()
                if s:
                    target_skills.append({"skill_id": s.id, "skill_name": s.name, "gap_percentage": 0.0})
            elif isinstance(item, str):
                s = db.query(Skill).filter(Skill.name.ilike(item)).first()
                if s:
                    target_skills.append({"skill_id": s.id, "skill_name": s.name, "gap_percentage": 0.0})

        # For each target gap skill, find relevant modules
        for ts in target_skills:
            s_id = ts["skill_id"]
            s_name = ts["skill_name"] or f"Skill-{s_id}"
            gap_pct = ts.get("gap_percentage", 0.0)

            # Query modules tagged with this skill
            modules = db.query(Module).filter(
                (Module.skill_id == s_id) | (Module.title.ilike(f"%{s_name}%"))
            ).all()

            if not modules:
                # Fallback: check if any module title has keywords
                modules = db.query(Module).filter(Module.title.ilike(f"%{s_name}%")).all()

            for mod in modules:
                course_title = mod.programme.title if mod.programme else "NCCT Certified Course"
                recommendations.append({
                    "skill_id": s_id,
                    "skill_name": s_name,
                    "module_id": mod.id,
                    "module_title": mod.title,
                    "course_id": mod.programme_id,
                    "course_title": course_title,
                    "order": mod.order,
                    "recommendation_text": f"Complete {s_name} Module: {mod.title}",
                    "player_url": f"/trainee/courses/{mod.programme_id}/player?module={mod.id}",
                    "gap_percentage": gap_pct
                })

        return recommendations
    finally:
        if should_close:
            db.close()
