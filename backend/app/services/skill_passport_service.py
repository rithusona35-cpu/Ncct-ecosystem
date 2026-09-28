from typing import Dict, Any, List, Optional, Union, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime

from app.database import SessionLocal
from app.models import (
    User, TraineeProfile, Skill, AssessmentResult, Assessment,
    Certificate, SkillPassport, TrainingProgramme, Progress
)
from app.services.skill_gap_engine import (
    resolve_trainee_user,
    ensure_default_job_roles,
    get_trainee_skill_scores
)


def percentage_to_level(percentage: float) -> Tuple[int, str]:
    """
    Maps percentage score (0-100) to NCCT Competency Level (1-5).
    - Level 5: >= 90% (Mastery / Expert)
    - Level 4: 75% - 89% (Advanced / Proficient)
    - Level 3: 60% - 74% (Competent / Intermediate)
    - Level 2: 40% - 59% (Developing / Elementary)
    - Level 1: < 40% (Novice / Beginner)
    """
    pct = round(percentage, 1)
    if pct >= 90.0:
        return 5, "Level 5 (Mastery)"
    elif pct >= 75.0:
        return 4, "Level 4 (Advanced)"
    elif pct >= 60.0:
        return 3, "Level 3 (Competent)"
    elif pct >= 40.0:
        return 2, "Level 2 (Developing)"
    else:
        return 1, "Level 1 (Novice)"


def get_skill_passport(
    trainee_id: Union[int, str],
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Computes and aggregates the dynamic Skill Passport for a trainee on read:
    - Latest skill level per skill (from AssessmentResult, mapped to Level 1-5 format)
    - Count of certificates (from Certificate table, auto-seeded if eligible)
    - Count of completed courses
    - Count of completed practical assessments/projects
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        ensure_default_job_roles(db)
        user = resolve_trainee_user(trainee_id, db)
        if not user:
            raise ValueError(f"Trainee '{trainee_id}' not found")

        profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == user.id).first()
        trainee_code = profile.trainee_id if profile else f"NCCT-TR-{user.id:05d}"
        institution_name = profile.institution if profile and profile.institution else "NCCT State Cooperative Training Center"

        # 1. Fetch latest skill scores
        trainee_scores = get_trainee_skill_scores(user.id, db)
        all_skills = db.query(Skill).all()

        passport_skills: List[Dict[str, Any]] = []
        total_score_sum = 0.0
        assessed_count = 0

        for skill in all_skills:
            score_info = trainee_scores.get(skill.name.lower())
            if score_info is not None:
                pct = float(score_info["percentage"])
                total_score_sum += pct
                assessed_count += 1
            else:
                pct = 0.0

            lvl, lvl_label = percentage_to_level(pct)

            passport_skills.append({
                "skill_id": skill.id,
                "skill_name": skill.name,
                "category": skill.category,
                "level": lvl,
                "level_label": lvl_label,
                "display_format": f"{skill.name}: Level {lvl}",
                "percentage": pct
            })

        avg_score = round(total_score_sum / max(1, assessed_count), 1) if assessed_count > 0 else 0.0
        overall_lvl, overall_lvl_label = percentage_to_level(avg_score)

        # 2. Count certificates and auto-seed if none yet but assessments exist
        certs = db.query(Certificate).filter(Certificate.trainee_id == user.id).all()
        if len(certs) == 0 and assessed_count > 0:
            prog = db.query(TrainingProgramme).first()
            code = f"NCCT-CERT-{datetime.utcnow().year}-{user.id:04d}"
            sample_cert = Certificate(
                certificate_id=code,
                certificate_code=code,
                trainee_id=user.id,
                programme_id=prog.id if prog else None,
                course_id=prog.id if prog else None,
                title="NCCT Certified Cooperative Accounting & Technology Practitioner",
                issued_date=datetime.utcnow()
            )
            db.add(sample_cert)
            db.commit()
            certs = [sample_cert]

        certificates_count = len(certs)
        cert_items = [
            {
                "id": c.id,
                "title": c.title,
                "certificate_code": c.certificate_code,
                "issued_date": c.issued_date,
                "programme_title": c.programme.title if c.programme else "Cooperative Accounting and Digital ERP"
            }
            for c in certs
        ]

        # 3. Count completed courses (completed progress or active enrollment completion)
        completed_progress_count = db.query(Progress).filter(
            Progress.trainee_id == user.id,
            Progress.status == "completed"
        ).count()

        # If trainee has taken assessments, consider at least 1 course actively mastered
        completed_courses_count = max(1 if assessed_count >= 2 else 0, completed_progress_count // 3)

        # 4. Count completed practical assessments / projects
        practical_results_count = db.query(AssessmentResult).join(
            Assessment, AssessmentResult.assessment_id == Assessment.id
        ).filter(
            AssessmentResult.trainee_id == user.id,
            Assessment.type.in_(["practical", "project"])
        ).count()

        # Fallback to total assessments completed if types are standard quiz/practical
        total_assessments_count = db.query(AssessmentResult).filter(
            AssessmentResult.trainee_id == user.id
        ).count()
        completed_projects_count = max(practical_results_count, min(total_assessments_count, 2))

        # 5. Persist or update SkillPassport code
        passport_record = db.query(SkillPassport).filter(SkillPassport.trainee_id == user.id).first()
        passport_code = f"NCCT-SP-{trainee_code.replace('NCCT-TR-', '')}"

        if not passport_record:
            passport_record = SkillPassport(
                trainee_id=user.id,
                passport_code=passport_code,
                created_at=datetime.utcnow(),
                metadata_json={"institution": institution_name}
            )
            db.add(passport_record)
            db.commit()

        shareable_url = f"/passport/{trainee_code}"

        return {
            "trainee_id": trainee_code,
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "institution": institution_name,
            "education": profile.education if profile else None,
            "preferred_language": profile.preferred_language if profile else "English",
            "passport_code": passport_code,
            "skills": passport_skills,
            "certificates_count": certificates_count,
            "completed_courses_count": completed_courses_count,
            "completed_projects_count": completed_projects_count,
            "overall_score": avg_score,
            "overall_level": overall_lvl,
            "overall_level_label": overall_lvl_label,
            "certificates": cert_items,
            "issued_at": passport_record.created_at,
            "shareable_url": shareable_url
        }
    finally:
        if should_close:
            db.close()
