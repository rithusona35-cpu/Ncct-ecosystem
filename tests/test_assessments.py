import pytest
from app.models import User, UserRole, TraineeProfile, Institution, TrainingProgramme, Skill, AssessmentResult
from app.security import hash_password

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

@pytest.fixture
def setup_assessment_env(db_session, client):
    # Create trainer
    trainer = User(
        name="Prof. Rajesh Sharma",
        email="trainer.tests@ncct.gov.in",
        hashed_password=hash_password("Demo@2025"),
        role=UserRole.TRAINER
    )
    # Create enrolled trainee
    trainee = User(
        name="Ravi Kumar",
        email="trainee.tests@ncct.gov.in",
        hashed_password=hash_password("Demo@2025"),
        role=UserRole.TRAINEE
    )
    # Create non-enrolled trainee
    other_trainee = User(
        name="Unenrolled Trainee",
        email="other.trainee@ncct.gov.in",
        hashed_password=hash_password("Demo@2025"),
        role=UserRole.TRAINEE
    )
    db_session.add_all([trainer, trainee, other_trainee])
    db_session.commit()
    db_session.refresh(trainer)
    db_session.refresh(trainee)
    db_session.refresh(other_trainee)

    inst = Institution(name="Regional Cooperative Institute", code="RCI-TEST", location="New Delhi")
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

    # Enrolled profile
    profile = TraineeProfile(
        user_id=trainee.id,
        trainee_id="NCCT-TR-TEST-001",
        institution=inst.name,
        course_enrolled="Cooperative Accounting and Digital ERP"
    )
    # Unenrolled profile (different course or None)
    other_profile = TraineeProfile(
        user_id=other_trainee.id,
        trainee_id="NCCT-TR-TEST-999",
        institution=inst.name,
        course_enrolled="Dairy Management Technology"
    )
    db_session.add_all([profile, other_profile])
    db_session.commit()

    trainer_token = get_auth_token(client, "trainer.tests@ncct.gov.in", "Demo@2025")
    trainee_token = get_auth_token(client, "trainee.tests@ncct.gov.in", "Demo@2025")
    other_token = get_auth_token(client, "other.trainee@ncct.gov.in", "Demo@2025")

    # Create skills if needed
    res_skills = client.get("/api/skills")
    skills_map = {s["name"]: s["id"] for s in res_skills.json()}

    return {
        "trainer": trainer,
        "trainee": trainee,
        "other_trainee": other_trainee,
        "programme": prog,
        "trainer_token": trainer_token,
        "trainee_token": trainee_token,
        "other_token": other_token,
        "skills_map": skills_map,
    }


def _create_sample_assessment(client, env):
    trainer_headers = {"Authorization": f"Bearer {env['trainer_token']}"}
    skills_map = env["skills_map"]

    accounting_id = skills_map["Accounting"]
    erp_id = skills_map["ERP"]
    gst_id = skills_map["GST"]

    payload = {
        "course_id": env["programme"].id,
        "title": "Comprehensive NCCT Competency Assessment",
        "type": "quiz",
        "questions": [
            {
                "text": "What is the debit entry for cash receipt?",
                "skill_id": accounting_id,
                "options": ["Debit Cash", "Credit Cash", "Debit Expense", "Debit Liability"],
                "correct_option": 0,
                "marks": 10
            },
            {
                "text": "Which ERP module reconciles sub-society ledgers?",
                "skill_id": erp_id,
                "options": ["HR Module", "General Ledger Module", "Marketing Module", "Asset Module"],
                "correct_option": 1,
                "marks": 10
            },
            {
                "text": "Under GST rules, agricultural warehousing is exempt under which section?",
                "skill_id": gst_id,
                "options": ["Taxed at 18%", "Exempt under Section 11 CGST", "Taxed at 28%", "Taxed at 12%"],
                "correct_option": 1,
                "marks": 10
            }
        ]
    }
    res = client.post("/api/assessment", json=payload, headers=trainer_headers)
    assert res.status_code == 200, res.text
    return res.json()


def test_submit_assessment_all_correct(client, setup_assessment_env):
    """1. test_submit_assessment_all_correct: 100% score, complete skill_wise_score JSON."""
    env = setup_assessment_env
    ass_data = _create_sample_assessment(client, env)
    ass_id = ass_data["id"]
    q_list = ass_data["questions"]

    trainee_headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # Format answers as aligned array payload
    answers = [
        {"question_id": q_list[0]["id"], "selected_option": "A"},  # index 0 (correct)
        {"question_id": q_list[1]["id"], "selected_option": "B"},  # index 1 (correct)
        {"question_id": q_list[2]["id"], "selected_option": "B"},  # index 1 (correct)
    ]

    res = client.post(f"/api/assessment/{ass_id}/submit", json={"answers": answers}, headers=trainee_headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["overall_score"] == 100.0
    assert data["total_marks_earned"] == 30
    assert data["total_marks_possible"] == 30

    skill_scores = data["skill_wise_score"]
    # Check that all skills are present in skill_wise_score
    for skill_name in ["Accounting", "ERP", "GST"]:
        assert skill_name in skill_scores
        item = skill_scores[skill_name]
        pct = item["percentage"] if isinstance(item, dict) else item
        assert pct == 100.0


def test_submit_assessment_partial_correct(client, setup_assessment_env):
    """2. test_submit_assessment_partial_correct: verify missing/wrong skill answers yield 0% for that skill key."""
    env = setup_assessment_env
    ass_data = _create_sample_assessment(client, env)
    ass_id = ass_data["id"]
    q_list = ass_data["questions"]

    trainee_headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # Q0 (Accounting): Correct (A -> index 0)
    # Q1 (ERP): Incorrect (A -> index 0, but correct is 1) -> 0%
    # Q2 (GST): Correct (B -> index 1)
    answers = [
        {"question_id": q_list[0]["id"], "selected_option": "A"},
        {"question_id": q_list[1]["id"], "selected_option": "A"},
        {"question_id": q_list[2]["id"], "selected_option": "B"},
    ]

    res = client.post(f"/api/assessment/{ass_id}/submit", json={"answers": answers}, headers=trainee_headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["total_marks_earned"] == 20
    assert data["total_marks_possible"] == 30
    assert data["overall_score"] == 66.7

    skill_scores = data["skill_wise_score"]
    # ERP was answered incorrectly: MUST be present with 0.0%
    assert "ERP" in skill_scores
    erp_item = skill_scores["ERP"]
    erp_pct = erp_item["percentage"] if isinstance(erp_item, dict) else erp_item
    assert erp_pct == 0.0

    # Accounting was answered correctly: 100.0%
    assert "Accounting" in skill_scores
    acc_item = skill_scores["Accounting"]
    acc_pct = acc_item["percentage"] if isinstance(acc_item, dict) else acc_item
    assert acc_pct == 100.0


def test_submit_assessment_reject_empty_payload(client, setup_assessment_env):
    """3. test_submit_assessment_reject_empty_payload: expect HTTP 400."""
    env = setup_assessment_env
    ass_data = _create_sample_assessment(client, env)
    ass_id = ass_data["id"]

    trainee_headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # Empty list
    res = client.post(f"/api/assessment/{ass_id}/submit", json={"answers": []}, headers=trainee_headers)
    assert res.status_code == 400, res.text

    # Empty dict
    res_dict = client.post(f"/api/assessment/{ass_id}/submit", json={"answers": {}}, headers=trainee_headers)
    assert res_dict.status_code == 400, res_dict.text


def test_submit_assessment_reject_duplicate_questions(client, setup_assessment_env):
    """4. test_submit_assessment_reject_duplicate_questions: expect HTTP 400."""
    env = setup_assessment_env
    ass_data = _create_sample_assessment(client, env)
    ass_id = ass_data["id"]
    q_list = ass_data["questions"]

    trainee_headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # Provide duplicate question_id
    duplicate_answers = [
        {"question_id": q_list[0]["id"], "selected_option": "A"},
        {"question_id": q_list[0]["id"], "selected_option": "B"},
    ]

    res = client.post(f"/api/assessment/{ass_id}/submit", json={"answers": duplicate_answers}, headers=trainee_headers)
    assert res.status_code == 400, res.text
    assert "duplicate" in res.json()["detail"].lower()


def test_submit_assessment_retake_updates_is_current(client, setup_assessment_env, db_session):
    """5. test_submit_assessment_retake_updates_is_current: verify prior attempt becomes is_current=False."""
    env = setup_assessment_env
    ass_data = _create_sample_assessment(client, env)
    ass_id = ass_data["id"]
    q_list = ass_data["questions"]

    trainee_headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # Attempt 1:
    answers1 = [
        {"question_id": q_list[0]["id"], "selected_option": "A"},
        {"question_id": q_list[1]["id"], "selected_option": "A"},  # wrong
        {"question_id": q_list[2]["id"], "selected_option": "B"},
    ]
    res1 = client.post(f"/api/assessment/{ass_id}/submit", json={"answers": answers1}, headers=trainee_headers)
    assert res1.status_code == 200
    res1_id = res1.json()["result_id"]

    # Verify attempt 1 is is_current == True
    r1 = db_session.query(AssessmentResult).filter(AssessmentResult.id == res1_id).first()
    assert r1 is not None
    assert r1.is_current is True

    # Attempt 2 (Retake):
    answers2 = [
        {"question_id": q_list[0]["id"], "selected_option": "A"},
        {"question_id": q_list[1]["id"], "selected_option": "B"},  # correct now
        {"question_id": q_list[2]["id"], "selected_option": "B"},
    ]
    res2 = client.post(f"/api/assessment/{ass_id}/submit", json={"answers": answers2}, headers=trainee_headers)
    assert res2.status_code == 200
    res2_id = res2.json()["result_id"]

    db_session.expire_all()
    r1_updated = db_session.query(AssessmentResult).filter(AssessmentResult.id == res1_id).first()
    r2_new = db_session.query(AssessmentResult).filter(AssessmentResult.id == res2_id).first()

    assert r1_updated.is_current is False, "Prior attempt must be marked is_current=False"
    assert r2_new.is_current is True, "Latest attempt must be marked is_current=True"


def test_submit_assessment_non_enrolled_user(client, setup_assessment_env):
    """6. test_submit_assessment_non_enrolled_user: expect HTTP 403."""
    env = setup_assessment_env
    ass_data = _create_sample_assessment(client, env)
    ass_id = ass_data["id"]
    q_list = ass_data["questions"]

    # Use other_token belonging to unenrolled trainee
    other_headers = {"Authorization": f"Bearer {env['other_token']}"}

    answers = [
        {"question_id": q_list[0]["id"], "selected_option": "A"},
    ]

    res = client.post(f"/api/assessment/{ass_id}/submit", json={"answers": answers}, headers=other_headers)
    assert res.status_code == 403, res.text
    assert "not enrolled" in res.json()["detail"].lower()
