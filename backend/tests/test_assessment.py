import pytest
from app.models import User, UserRole, TraineeProfile, Institution, TrainingProgramme, Skill
from app.security import hash_password

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

@pytest.fixture
def setup_assessment_environment(db_session, client):
    trainer = User(
        name="Dr. Ananya Trainer",
        email="trainer.ass@ncct.edu",
        hashed_password=hash_password("Password123!"),
        role=UserRole.TRAINER
    )
    trainee = User(
        name="Vikram Sharma",
        email="trainee.ass@ncct.edu",
        hashed_password=hash_password("Password123!"),
        role=UserRole.TRAINEE
    )
    db_session.add_all([trainer, trainee])
    db_session.commit()
    db_session.refresh(trainer)
    db_session.refresh(trainee)

    profile = TraineeProfile(
        user_id=trainee.id,
        trainee_id="NCCT-TR-2026-88888",
        institution="VAMNICOM Pune",
        course_enrolled="Cooperative Accounting"
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    inst = Institution(name="VAMNICOM Pune", code="VAMNICOM-ASS", location="Pune")
    db_session.add(inst)
    db_session.commit()
    db_session.refresh(inst)

    prog = TrainingProgramme(
        title="Cooperative Accounting and Digital ERP",
        institution_id=inst.id,
        trainer_id=trainer.id
    )
    db_session.add(prog)
    db_session.commit()
    db_session.refresh(prog)

    trainer_token = get_auth_token(client, "trainer.ass@ncct.edu", "Password123!")
    trainee_token = get_auth_token(client, "trainee.ass@ncct.edu", "Password123!")

    return {
        "trainer": trainer,
        "trainee": trainee,
        "profile": profile,
        "programme": prog,
        "trainer_token": trainer_token,
        "trainee_token": trainee_token,
    }


def test_skills_registry(client):
    res = client.get("/api/skills")
    assert res.status_code == 200
    skills = res.json()
    assert len(skills) >= 5
    names = [s["name"] for s in skills]
    assert "Accounting" in names
    assert "ERP" in names
    assert "GST" in names


def test_trainer_create_assessment_with_3_skills(client, setup_assessment_environment):
    env = setup_assessment_environment
    trainer_headers = {"Authorization": f"Bearer {env['trainer_token']}"}

    # Fetch skills to get IDs
    res_skills = client.get("/api/skills")
    skills_map = {s["name"]: s["id"] for s in res_skills.json()}

    accounting_id = skills_map["Accounting"]
    erp_id = skills_map["ERP"]
    gst_id = skills_map["GST"]

    payload = {
        "course_id": env["programme"].id,
        "title": "Cooperative Financial Competency & ERP Assessment",
        "type": "quiz",
        "questions": [
            {
                "text": "What is the primary balance sheet treatment for a member share capital contribution?",
                "skill_id": accounting_id,
                "options": ["Credit Member Capital", "Debit Member Capital", "Credit Revenue", "Debit Reserve"],
                "correct_option": 0,
                "marks": 10
            },
            {
                "text": "Which ERP ledger module handles automated sub-society reconciliation?",
                "skill_id": erp_id,
                "options": ["Human Resources", "General Ledger & Audit Trial Module", "Marketing CRM", "Asset Tracking"],
                "correct_option": 1,
                "marks": 10
            },
            {
                "text": "Under GST regulations for agricultural cooperatives, what is the exemption status for primary produce warehousing?",
                "skill_id": gst_id,
                "options": ["Taxed at 18%", "Exempt under Section 11 of CGST Act", "Taxed at 28% luxury", "Taxed at 5%"],
                "correct_option": 1,
                "marks": 10
            }
        ]
    }

    res = client.post("/api/assessment", json=payload, headers=trainer_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == payload["title"]
    assert len(data["questions"]) == 3
    assert data["total_marks"] == 30

    skills_tagged = [q["skill_name"] for q in data["questions"]]
    assert "Accounting" in skills_tagged
    assert "ERP" in skills_tagged
    assert "GST" in skills_tagged


def test_trainee_assessment_skill_wise_score_breakdown(client, setup_assessment_environment):
    env = setup_assessment_environment
    trainer_headers = {"Authorization": f"Bearer {env['trainer_token']}"}
    trainee_headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # 1. Trainer creates 3-skill assessment
    res_skills = client.get("/api/skills")
    skills_map = {s["name"]: s["id"] for s in res_skills.json()}

    accounting_id = skills_map["Accounting"]
    erp_id = skills_map["ERP"]
    gst_id = skills_map["GST"]

    create_res = client.post("/api/assessment", json={
        "course_id": env["programme"].id,
        "title": "NCCT 3-Skill Benchmark Assessment",
        "type": "quiz",
        "questions": [
            {
                "text": "Accounting Q: Double entry debit?",
                "skill_id": accounting_id,
                "options": ["Opt A", "Opt B"],
                "correct_option": 0,
                "marks": 10
            },
            {
                "text": "ERP Q: Enterprise workflow?",
                "skill_id": erp_id,
                "options": ["Opt A", "Opt B"],
                "correct_option": 1,
                "marks": 10
            },
            {
                "text": "GST Q: Input tax credit claim?",
                "skill_id": gst_id,
                "options": ["Opt A", "Opt B"],
                "correct_option": 1,
                "marks": 10
            }
        ]
    }, headers=trainer_headers)
    assert create_res.status_code == 200
    assessment_id = create_res.json()["id"]
    q_ids = [q["id"] for q in create_res.json()["questions"]]

    # 2. Trainee fetches assessment
    res_get = client.get(f"/api/assessment/{assessment_id}", headers=trainee_headers)
    assert res_get.status_code == 200
    assert len(res_get.json()["questions"]) == 3

    # 3. Trainee submits:
    # Q1 (Accounting): 0 (Correct -> 10/10 = 100%)
    # Q2 (ERP): 0 (Incorrect -> 0/10 = 0%)
    # Q3 (GST): 1 (Correct -> 10/10 = 100%)
    submit_payload = {
        "answers": {
            str(q_ids[0]): 0,
            str(q_ids[1]): 0,
            str(q_ids[2]): 1
        }
    }
    res_sub = client.post(f"/api/assessment/{assessment_id}/submit", json=submit_payload, headers=trainee_headers)
    assert res_sub.status_code == 200
    sub_data = res_sub.json()

    assert sub_data["total_marks_earned"] == 20
    assert sub_data["total_marks_possible"] == 30
    assert sub_data["overall_score"] == 66.7

    skill_scores = sub_data["skill_wise_score"]
    assert str(accounting_id) in skill_scores
    assert skill_scores[str(accounting_id)]["percentage"] == 100.0
    assert skill_scores[str(erp_id)]["percentage"] == 0.0
    assert skill_scores[str(gst_id)]["percentage"] == 100.0

    # 4. Query Trainee Skill Scores API (feeds Skill-Gap Engine)
    res_feed = client.get(f"/api/assessment/trainee/{env['profile'].trainee_id}/skill-scores", headers=trainee_headers)
    assert res_feed.status_code == 200
    feed_data = res_feed.json()
    assert feed_data["trainee_id"] == env["profile"].trainee_id
    assert len(feed_data["skills"]) >= 3

    feed_map = {s["skill_name"]: s["percentage"] for s in feed_data["skills"]}
    assert feed_map["Accounting"] == 100.0
    assert feed_map["ERP"] == 0.0
    assert feed_map["GST"] == 100.0
