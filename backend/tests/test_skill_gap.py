import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import (
    User, TraineeProfile, Skill, JobRole, JobRoleSkillRequirement,
    Assessment, AssessmentResult, Module, TrainingProgramme, Institution
)
from app.security import hash_password, create_access_token
from app.services.skill_gap_engine import (
    compare_trainee_to_role,
    get_recommended_modules,
    ensure_default_job_roles
)

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_job_roles_registry(db_session):
    """
    Verify standard job roles exist and have appropriate skill competency requirements.
    """
    roles = ensure_default_job_roles(db_session)
    role_titles = [r.title for r in roles]
    assert "Cooperative Accountant" in role_titles
    assert "PACS General Manager" in role_titles

    acct_role = db_session.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()
    assert acct_role is not None

    reqs_by_skill = {r.skill.name: r.required_level for r in acct_role.requirements if r.skill}
    assert reqs_by_skill.get("Accounting") == "HIGH"
    assert reqs_by_skill.get("ERP") in ("MEDIUM", "HIGH")
    assert reqs_by_skill.get("GST") in ("MEDIUM", "HIGH")


def test_dod_trainee_skill_gap_analysis(db_session):
    """
    Definition of Done Test:
    For a trainee with ERP=52%, GST=48%, Accounting=88%, selecting 'Cooperative Accountant'
    job role correctly flags ERP and GST as gaps and recommends the correct modules.
    """
    ensure_default_job_roles(db_session)

    # 1. Create or retrieve DoD Trainee
    trainee = db_session.query(User).filter(User.email == "dod.trainee@ncct.edu").first()
    if not trainee:
        trainee = User(
            name="DoD Trainee Sample",
            email="dod.trainee@ncct.edu",
            hashed_password=hash_password("Password123!"),
            role="TRAINEE",
            created_at=datetime.utcnow()
        )
        db_session.add(trainee)
        db_session.flush()

        profile = TraineeProfile(
            user_id=trainee.id,
            trainee_id="NCCT-TR-DOD-001",
            education="B.Com Cooperative Banking",
            preferred_language="English",
            previous_skills=["Accounting Basics"]
        )
        db_session.add(profile)
        db_session.flush()

    # 2. Ensure an Assessment exists to attach the results
    assessment = db_session.query(Assessment).first()
    if not assessment:
        inst = db_session.query(Institution).first()
        prog = db_session.query(TrainingProgramme).first()
        if not prog:
            prog = TrainingProgramme(
                title="Cooperative Accounting and Digital ERP",
                institution_id=inst.id if inst else 1,
                trainer_id=trainee.id,
                created_at=datetime.utcnow()
            )
            db_session.add(prog)
            db_session.flush()

        assessment = Assessment(
            course_id=prog.id,
            title="Cooperative Accounting Competency Assessment",
            type="quiz",
            created_at=datetime.utcnow()
        )
        db_session.add(assessment)
        db_session.flush()

    # 3. Create AssessmentResult with ERP=52%, GST=48%, Accounting=88%
    skill_acc = db_session.query(Skill).filter(Skill.name == "Accounting").first()
    skill_erp = db_session.query(Skill).filter(Skill.name == "ERP").first()
    skill_gst = db_session.query(Skill).filter(Skill.name == "GST").first()

    mock_skill_wise_score = {
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

    # Add passing scores for other skills if present in role so only ERP and GST are gaps
    for s_name, pass_pct in [("Cooperative Accounting", 80.0), ("Excel", 85.0), ("Communication", 70.0)]:
        s_extra = db_session.query(Skill).filter(Skill.name == s_name).first()
        if s_extra:
            mock_skill_wise_score[str(s_extra.id)] = {
                "skill_id": s_extra.id,
                "skill_name": s_name,
                "marks_obtained": int(pass_pct),
                "total_marks": 100,
                "percentage": pass_pct
            }

    result = AssessmentResult(
        trainee_id=trainee.id,
        assessment_id=assessment.id,
        skill_wise_score=mock_skill_wise_score,
        overall_score=63,
        total_marks_earned=188,
        total_marks_possible=300,
        submitted_at=datetime.utcnow()
    )
    db_session.add(result)
    db_session.commit()

    # 4. Compare trainee to "Cooperative Accountant" role
    role = db_session.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()
    assert role is not None

    comparisons = compare_trainee_to_role(trainee.id, role.id, db_session)
    comp_by_skill = {c["skill"]: c for c in comparisons}

    # Verify Accounting: 88% >= 70% (HIGH) -> MATCHED, gap == False
    assert "Accounting" in comp_by_skill
    assert comp_by_skill["Accounting"]["trainee_level"] == 88.0
    assert comp_by_skill["Accounting"]["gap"] is False
    assert comp_by_skill["Accounting"]["status"] == "MATCHED"

    # Verify ERP: 52% < 60% (MEDIUM) -> GAP, gap == True
    assert "ERP" in comp_by_skill
    assert comp_by_skill["ERP"]["trainee_level"] == 52.0
    assert comp_by_skill["ERP"]["gap"] is True
    assert comp_by_skill["ERP"]["status"] == "GAP"

    # Verify GST: 48% < 60% (MEDIUM) -> GAP, gap == True
    assert "GST" in comp_by_skill
    assert comp_by_skill["GST"]["trainee_level"] == 48.0
    assert comp_by_skill["GST"]["gap"] is True
    assert comp_by_skill["GST"]["status"] == "GAP"

    # 5. Check Recommendations: ERP and GST modules should be recommended
    gaps = [c for c in comparisons if c["gap"] is True]
    assert len(gaps) == 2  # ERP and GST
    assert {g["skill"] for g in gaps} == {"ERP", "GST"}

    recommendations = get_recommended_modules(gaps, trainee.id, db_session)
    assert len(recommendations) >= 2

    rec_skills = {r["skill_name"] for r in recommendations}
    assert "ERP" in rec_skills
    assert "GST" in rec_skills

    # Verify recommendation text format
    for rec in recommendations:
        assert rec["recommendation_text"].startswith("Complete")
        assert "Module" in rec["recommendation_text"]
        assert rec["player_url"].startswith("/trainee/courses/")


def test_api_skill_gap_endpoints(db_session):
    """
    Test FastAPI endpoints:
    1. GET /api/skills/job-roles
    2. GET /api/skills/gap-analysis/{trainee_id}/{job_role_id}
    3. GET /api/skills/recommendations/{trainee_id}
    """
    ensure_default_job_roles(db_session)
    trainee = db_session.query(User).filter(User.email == "dod.trainee@ncct.edu").first()
    assert trainee is not None

    token = create_access_token({"sub": trainee.email, "role": trainee.role})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test GET /api/skills/job-roles
    res = client.get("/api/skills/job-roles", headers=headers)
    assert res.status_code == 200
    roles = res.json()
    assert len(roles) >= 1
    role_id = roles[0]["id"]

    # 2. Test GET /api/skills/gap-analysis/{trainee_id}/{job_role_id}
    res_gap = client.get(f"/api/skills/gap-analysis/{trainee.id}/{role_id}", headers=headers)
    assert res_gap.status_code == 200
    data = res_gap.json()
    assert data["trainee_name"] == trainee.name
    assert "skills" in data
    assert "overall_match_percentage" in data

    # 3. Test GET /api/skills/recommendations/{trainee_id}
    res_rec = client.get(f"/api/skills/recommendations/{trainee.id}?job_role_id={role_id}", headers=headers)
    assert res_rec.status_code == 200
    rec_data = res_rec.json()
    assert "recommendations" in rec_data
    assert rec_data["total_gaps_identified"] >= 1
