import pytest
from app.models import User, UserRole, Institution, TrainingProgramme, Module, ContentItem, Batch, TraineeProfile
from app.security import hash_password

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

@pytest.fixture
def setup_lms_environment(db_session, client):
    # Create trainer
    trainer = User(
        name="Dr. Ananya Trainer",
        email="trainer.lms@ncct.edu",
        hashed_password=hash_password("Password123!"),
        role=UserRole.TRAINER
    )
    # Create trainee
    trainee = User(
        name="Vikram Sharma",
        email="trainee.lms@ncct.edu",
        hashed_password=hash_password("Password123!"),
        role=UserRole.TRAINEE
    )
    db_session.add_all([trainer, trainee])
    db_session.commit()
    db_session.refresh(trainer)
    db_session.refresh(trainee)

    # Create trainee profile
    profile = TraineeProfile(
        user_id=trainee.id,
        trainee_id="NCCT-TR-2026-99999",
        institution="VAMNICOM Pune",
        course_enrolled="Cooperative Accounting"
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    # Create institution
    inst = Institution(name="VAMNICOM Pune", code="VAMNICOM", location="Pune")
    db_session.add(inst)
    db_session.commit()
    db_session.refresh(inst)

    # Create programme
    prog = TrainingProgramme(
        title="Cooperative Accounting and Digital ERP",
        description="Comprehensive training course",
        institution_id=inst.id,
        trainer_id=trainer.id
    )
    db_session.add(prog)
    db_session.commit()
    db_session.refresh(prog)

    # Create Module 1
    m1 = Module(programme_id=prog.id, title="Module 1: Principles of Cooperative Accounting", order=1)
    db_session.add(m1)
    db_session.commit()
    db_session.refresh(m1)

    # Add content item
    ci = ContentItem(
        module_id=m1.id,
        type="video",
        title="Introduction to Cooperative Accounting",
        url_or_file_path="https://www.youtube.com/watch?v=demo",
        order=1
    )
    db_session.add(ci)
    db_session.commit()
    db_session.refresh(ci)

    # Create Batch and enroll trainee
    batch = Batch(programme_id=prog.id, batch_name="Autumn 2026 Batch A")
    batch.trainees.append(profile)
    db_session.add(batch)
    db_session.commit()
    db_session.refresh(batch)

    trainer_token = get_auth_token(client, "trainer.lms@ncct.edu", "Password123!")
    trainee_token = get_auth_token(client, "trainee.lms@ncct.edu", "Password123!")

    return {
        "trainer": trainer,
        "trainee": trainee,
        "profile": profile,
        "programme": prog,
        "module": m1,
        "content_item": ci,
        "batch": batch,
        "trainer_token": trainer_token,
        "trainee_token": trainee_token,
    }


def test_get_module_content_and_auto_seed_quiz(client, setup_lms_environment):
    env = setup_lms_environment
    m_id = env["module"].id
    headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    res = client.get(f"/api/lms/module/{m_id}/content", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["module_id"] == m_id
    assert len(data["content_items"]) == 1
    assert data["content_items"][0]["status"] == "not_started"
    
    # Auto-seeded quiz should exist
    assert len(data["quizzes"]) == 1
    assert "Knowledge Check" in data["quizzes"][0]["title"]
    assert data["quizzes"][0]["total_questions"] == 3
    assert data["quizzes"][0]["total_marks"] == 15
    assert data["quizzes"][0]["is_completed"] is False


def test_mark_content_complete(client, setup_lms_environment):
    env = setup_lms_environment
    ci_id = env["content_item"].id
    m_id = env["module"].id
    headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # Mark complete
    res = client.post("/api/lms/progress/mark-complete", json={"content_item_id": ci_id, "module_id": m_id}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["content_item_id"] == ci_id
    assert data["status"] == "completed"
    assert data["completed_at"] is not None

    # Check updated module content
    res_mod = client.get(f"/api/lms/module/{m_id}/content", headers=headers)
    assert res_mod.status_code == 200
    mod_data = res_mod.json()
    assert mod_data["content_items"][0]["status"] == "completed"


def test_quiz_integrity_and_auto_grading(client, setup_lms_environment):
    env = setup_lms_environment
    m_id = env["module"].id
    headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # First get module to trigger quiz creation
    res_mod = client.get(f"/api/lms/module/{m_id}/content", headers=headers)
    quiz_id = res_mod.json()["quizzes"][0]["id"]

    # Trainee fetches quiz
    res_quiz = client.get(f"/api/lms/quiz/{quiz_id}", headers=headers)
    assert res_quiz.status_code == 200
    quiz_data = res_quiz.json()
    assert len(quiz_data["questions"]) == 3
    for q in quiz_data["questions"]:
        assert "correct_option" not in q, "Security failure: correct_option exposed to trainee"
        assert len(q["options"]) == 4

    # Submit answers (Q1: 0 (correct), Q2: 1 (correct), Q3: 1 (correct)) -> 100% score
    q_ids = [q["id"] for q in quiz_data["questions"]]
    submit_payload = {
        "answers": {
            str(q_ids[0]): 0,
            str(q_ids[1]): 1,
            str(q_ids[2]): 1,
        }
    }
    res_submit = client.post(f"/api/lms/quiz/{quiz_id}/submit", json=submit_payload, headers=headers)
    assert res_submit.status_code == 200
    sub_data = res_submit.json()
    assert sub_data["score"] == 15
    assert sub_data["total_marks"] == 15
    assert sub_data["percentage"] == 100.0
    assert sub_data["passed"] is True
    assert len(sub_data["question_results"]) == 3
    assert all(r["is_correct"] for r in sub_data["question_results"])


def test_trainee_live_course_progress_percentage(client, setup_lms_environment):
    env = setup_lms_environment
    m_id = env["module"].id
    ci_id = env["content_item"].id
    headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # Initialize quiz
    res_mod = client.get(f"/api/lms/module/{m_id}/content", headers=headers)
    quiz_id = res_mod.json()["quizzes"][0]["id"]

    # Initial progress: 0% (0 of 2 items: 1 content item + 1 quiz)
    res_prog = client.get(f"/api/lms/progress/{env['profile'].trainee_id}", headers=headers)
    assert res_prog.status_code == 200
    prog_data = res_prog.json()
    assert len(prog_data) == 1
    assert prog_data[0]["total_items"] == 2
    assert prog_data[0]["completed_items"] == 0
    assert prog_data[0]["completion_percentage"] == 0

    # Step 1: Mark content item complete
    client.post("/api/lms/progress/mark-complete", json={"content_item_id": ci_id, "module_id": m_id}, headers=headers)

    # Progress should now be 50% (1 of 2 items)
    res_prog2 = client.get(f"/api/lms/progress/me", headers=headers)
    assert res_prog2.status_code == 200
    prog_data2 = res_prog2.json()
    assert prog_data2[0]["completed_items"] == 1
    assert prog_data2[0]["completion_percentage"] == 50

    # Step 2: Take quiz and pass it
    res_quiz = client.get(f"/api/lms/quiz/{quiz_id}", headers=headers)
    q_ids = [q["id"] for q in res_quiz.json()["questions"]]
    client.post(f"/api/lms/quiz/{quiz_id}/submit", json={
        "answers": {str(q_ids[0]): 0, str(q_ids[1]): 1, str(q_ids[2]): 1}
    }, headers=headers)

    # Progress should now be 100% (2 of 2 items)
    res_prog3 = client.get(f"/api/lms/progress/{env['trainee'].id}", headers=headers)
    assert res_prog3.status_code == 200
    prog_data3 = res_prog3.json()
    assert prog_data3[0]["completed_items"] == 2
    assert prog_data3[0]["completion_percentage"] == 100
