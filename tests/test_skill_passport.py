import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import (
    User, TraineeProfile, Skill, Assessment, AssessmentResult,
    TrainingProgramme, Institution, Certificate
)
from app.security import hash_password, create_access_token
from app.services.skill_passport_service import get_skill_passport, percentage_to_level
from app.services.skill_gap_engine import ensure_default_job_roles

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_percentage_to_level_mapping():
    """
    Test 1-5 level boundary mapping:
    >=90: Level 5
    75-89: Level 4
    60-74: Level 3
    40-59: Level 2
    <40: Level 1
    """
    assert percentage_to_level(95.0)[0] == 5
    assert percentage_to_level(88.0)[0] == 4
    assert percentage_to_level(75.0)[0] == 4
    assert percentage_to_level(65.0)[0] == 3
    assert percentage_to_level(52.0)[0] == 2
    assert percentage_to_level(48.0)[0] == 2
    assert percentage_to_level(30.0)[0] == 1


def test_dod_ravi_skill_passport_levels_and_auto_recompute(db_session):
    """
    Definition of Done:
    After Ravi completes courses and assessments, his Skill Passport page shows
    updated levels automatically, matching the example format (Skill: Level X format).
    And when a new assessment is submitted, levels recompute automatically on read.
    """
    ensure_default_job_roles(db_session)

    # 1. Create or retrieve Trainee Ravi Kumar
    trainee_ravi = db_session.query(User).filter(User.email == "ravi.kumar@ncct.edu").first()
    if not trainee_ravi:
        trainee_ravi = User(
            name="Ravi Kumar",
            email="ravi.kumar@ncct.edu",
            hashed_password=hash_password("Password123!"),
            role="TRAINEE",
            created_at=datetime.utcnow()
        )
        db_session.add(trainee_ravi)
        db_session.flush()

        profile = TraineeProfile(
            user_id=trainee_ravi.id,
            trainee_id="NCCT-TR-RAVI-001",
            institution="VAMNICOM Regional Training Center",
            education="B.Sc Cooperative Management",
            preferred_language="Hindi",
            previous_skills=["Bookkeeping"]
        )
        db_session.add(profile)
        db_session.flush()

    # 2. Setup assessment
    prog = db_session.query(TrainingProgramme).first()
    assessment = db_session.query(Assessment).first()

    skill_acc = db_session.query(Skill).filter(Skill.name == "Accounting").first()
    skill_erp = db_session.query(Skill).filter(Skill.name == "ERP").first()
    skill_gst = db_session.query(Skill).filter(Skill.name == "GST").first()

    # 3. Ravi submits Assessment 1: Accounting=88%, ERP=52%, GST=48%
    score_1 = {
        str(skill_acc.id): {
            "skill_id": skill_acc.id,
            "skill_name": "Accounting",
            "marks_obtained": 88,
            "total_marks": 100,
            "percentage": 88.0
        },
        str(skill_erp.id): {
            "skill_id": skill_erp.id,
            "skill_name": "ERP",
            "marks_obtained": 52,
            "total_marks": 100,
            "percentage": 52.0
        },
        str(skill_gst.id): {
            "skill_id": skill_gst.id,
            "skill_name": "GST",
            "marks_obtained": 48,
            "total_marks": 100,
            "percentage": 48.0
        }
    }

    res_1 = AssessmentResult(
        trainee_id=trainee_ravi.id,
        assessment_id=assessment.id,
        skill_wise_score=score_1,
        overall_score=63,
        total_marks_earned=188,
        total_marks_possible=300,
        submitted_at=datetime.utcnow()
    )
    db_session.add(res_1)
    db_session.commit()

    # 4. Generate Skill Passport
    passport_1 = get_skill_passport(trainee_ravi.id, db_session)
    assert passport_1["name"] == "Ravi Kumar"
    assert passport_1["trainee_id"] == "NCCT-TR-RAVI-001"
    assert passport_1["certificates_count"] >= 1
    assert passport_1["completed_courses_count"] >= 1

    skills_map_1 = {s["skill_name"]: s for s in passport_1["skills"]}

    # Verify Skill: Level X format
    assert skills_map_1["Accounting"]["level"] == 4
    assert skills_map_1["Accounting"]["display_format"] == "Accounting: Level 4"

    assert skills_map_1["ERP"]["level"] == 2
    assert skills_map_1["ERP"]["display_format"] == "ERP: Level 2"

    assert skills_map_1["GST"]["level"] == 2
    assert skills_map_1["GST"]["display_format"] == "GST: Level 2"

    # 5. Dynamic Recalculation Test: Ravi completes an advanced ERP project -> score improves to 92% (Level 5)
    score_2 = {
        str(skill_erp.id): {
            "skill_id": skill_erp.id,
            "skill_name": "ERP",
            "marks_obtained": 92,
            "total_marks": 100,
            "percentage": 92.0
        }
    }
    res_2 = AssessmentResult(
        trainee_id=trainee_ravi.id,
        assessment_id=assessment.id,
        skill_wise_score=score_2,
        overall_score=92,
        total_marks_earned=92,
        total_marks_possible=100,
        submitted_at=datetime.utcnow()
    )
    db_session.add(res_2)
    db_session.commit()

    # Re-read Skill Passport without any manual cache flush
    passport_2 = get_skill_passport(trainee_ravi.id, db_session)
    skills_map_2 = {s["skill_name"]: s for s in passport_2["skills"]}

    # ERP must automatically update to Level 5!
    assert skills_map_2["ERP"]["level"] == 5
    assert skills_map_2["ERP"]["display_format"] == "ERP: Level 5"
    assert skills_map_2["ERP"]["percentage"] == 92.0
    # Accounting remains at Level 4
    assert skills_map_2["Accounting"]["level"] == 4


def test_api_skill_passport_endpoints(db_session):
    """
    Test GET /api/skill-passport/{trainee_id}
    """
    ravi = db_session.query(User).filter(User.email == "ravi.kumar@ncct.edu").first()
    assert ravi is not None

    token = create_access_token({"sub": ravi.email, "role": ravi.role})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test with 'me'
    res_me = client.get("/api/skill-passport/me", headers=headers)
    assert res_me.status_code == 200
    data_me = res_me.json()
    assert data_me["name"] == "Ravi Kumar"
    assert "skills" in data_me
    assert "certificates_count" in data_me
    assert "passport_code" in data_me

    # 2. Test with trainee_id code
    res_code = client.get(f"/api/skill-passport/{data_me['trainee_id']}", headers=headers)
    assert res_code.status_code == 200
    data_code = res_code.json()
    assert data_code["user_id"] == ravi.id
