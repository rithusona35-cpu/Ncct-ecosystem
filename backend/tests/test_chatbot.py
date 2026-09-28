import re
import pytest
from datetime import datetime, timedelta
from app.models import (
    User, UserRole, TraineeProfile, Institution, TrainingProgramme,
    Batch, Module, ContentItem, Attendance, Progress, JobPosting, JobRole
)
from app.security import hash_password
from app.services.chatbot_service import classify_intent


def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_keyword_intent_classifier():
    """Verify keyword mappings to intents as defined in specification."""
    # Data queries
    assert classify_intent("What is my current attendance?") == "progress_query"
    assert classify_intent("How much progress have I made?") == "progress_query"
    assert classify_intent("Did I complete all lessons?") == "progress_query"
    assert classify_intent("What is my missing skill gap?") == "skill_gap_query"
    assert classify_intent("What skills do I need?") == "skill_gap_query"
    assert classify_intent("Are there any job openings?") == "career_query"
    assert classify_intent("I want career advice") == "career_query"
    assert classify_intent("Where can I find my certificate?") == "certificate_query"
    assert classify_intent("When is my next class?") == "training_schedule_query"
    assert classify_intent("Show my training schedule") == "training_schedule_query"

    # Learning / RAG queries
    assert classify_intent("Explain cooperative accounting") == "learning_question"
    assert classify_intent("What is PACS?") == "learning_question"
    assert classify_intent("How does statutory reserve fund work?") == "learning_question"

    # Fallback
    assert classify_intent("Good morning bot") == "general_chat"


@pytest.fixture
def trainee_environment(db_session, client):
    """Sets up a realistic trainee with attendance, enrolled batch, modules, and progress."""
    user = User(
        name="Ramesh Kumar",
        email="ramesh.chatbot@ncct.edu",
        hashed_password=hash_password("TraineePass123!"),
        role=UserRole.TRAINEE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    profile = TraineeProfile(
        user_id=user.id,
        trainee_id="NCCT-TR-2026-99991",
        institution="ICM Chennai",
        course_enrolled="Cooperative Management",
        preferred_language="English"
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    trainer = User(
        name="Dr. S. Ramanathan",
        email="ramanathan.trainer@ncct.edu",
        hashed_password=hash_password("TrainerPass123!"),
        role=UserRole.TRAINER
    )
    db_session.add(trainer)
    db_session.commit()
    db_session.refresh(trainer)

    # Institution & Programme
    inst = Institution(name="ICM Chennai", code="ICM-CHE", location="Chennai")
    db_session.add(inst)
    db_session.commit()
    db_session.refresh(inst)

    prog = TrainingProgramme(
        title="Diploma in Cooperative Banking & Audit",
        description="Comprehensive cooperative training",
        institution_id=inst.id,
        trainer_id=trainer.id,
        start_date=datetime.utcnow() - timedelta(days=10),
        end_date=datetime.utcnow() + timedelta(days=20)
    )
    db_session.add(prog)
    db_session.commit()
    db_session.refresh(prog)

    # Batch and enrollment
    batch = Batch(programme_id=prog.id, batch_name="Batch A - 2026")
    db_session.add(batch)
    db_session.commit()
    db_session.refresh(batch)

    profile.enrolled_batches.append(batch)
    db_session.commit()

    # Modules
    m1 = Module(programme_id=prog.id, title="Module 1: Cooperative Principles", order=1)
    m2 = Module(programme_id=prog.id, title="Module 2: PACS Digitization", order=2)
    db_session.add_all([m1, m2])
    db_session.commit()
    db_session.refresh(m1)
    db_session.refresh(m2)

    # Content item for Module 1
    c1 = ContentItem(module_id=m1.id, type="pdf", title="Principles Notes", url_or_file_path="/uploads/test.pdf", order=1)
    db_session.add(c1)
    db_session.commit()
    db_session.refresh(c1)

    # Trainee completed module 1 content
    p1 = Progress(trainee_id=user.id, module_id=m1.id, content_item_id=c1.id, status="completed")
    db_session.add(p1)
    db_session.commit()

    # Seed 8 attendance records (8 / 10 = 80%)
    for i in range(8):
        att = Attendance(
            trainee_id=user.id,
            session_id=f"SESSION-{i+1}",
            date=f"2026-09-{10+i:02d}",
            check_in_time=datetime.utcnow() - timedelta(days=10 - i),
            status="PRESENT",
            device_id="GATE-01"
        )
        db_session.add(att)
    db_session.commit()

    token = get_auth_token(client, "ramesh.chatbot@ncct.edu", "TraineePass123!")

    return {
        "user": user,
        "profile": profile,
        "token": token,
        "programme": prog
    }


def test_chatbot_attendance_query_real_trainee(client, trainee_environment):
    """Confirm sending a message containing 'attendance' returns natural sentence with real data (80%)."""
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "What is my current attendance?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "progress_query"
    # Underlying data: 80% attendance
    assert "80" in data["response"]
    assert "attendance" in data["response"].lower()
    # Confirm it is a natural sentence, not just raw json or error
    assert len(data["response"].split()) > 3


def test_chatbot_learning_question_cooperative_accounting(client, trainee_environment):
    """Confirm 'Explain cooperative accounting' queries ChromaDB knowledge base and returns grounded reply."""
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "Explain cooperative accounting"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "learning_question"
    # Grounded response should reference cooperative principles or accounting concepts
    text_lower = data["response"].lower()
    assert any(term in text_lower for term in ["cooperative", "accounting", "audit", "reserve", "ledger", "bookkeeping"])


def test_chatbot_learning_question_pacs(client, trainee_environment):
    """Confirm 'What is PACS?' queries ChromaDB and returns grounded explanation from pacs-explained.md."""
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "What is PACS?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "learning_question"
    text_lower = data["response"].lower()
    assert any(term in text_lower for term in ["pacs", "primary agricultural credit", "credit societies", "credit structure"])


def test_chatbot_multilingual_tamil(client, trainee_environment, db_session):
    """
    Confirm that when trainee's preferred_language is set to Tamil,
    responses come back in natural Tamil script.
    """
    profile = trainee_environment["profile"]
    profile.preferred_language = "Tamil"
    db_session.commit()
    db_session.refresh(profile)

    token = trainee_environment["token"]

    # 1. Test learning question in Tamil
    response = client.post(
        "/api/chatbot/message",
        json={"message": "Explain cooperative accounting"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "learning_question"
    # Verify response contains Tamil Unicode characters (range \u0B80 - \u0BFF)
    tamil_chars = re.findall(r"[\u0b80-\u0bff]", data["response"])
    assert len(tamil_chars) > 10, "Response does not contain expected Tamil script"

    # 2. Test attendance query in Tamil retains underlying data (80)
    att_response = client.post(
        "/api/chatbot/message",
        json={"message": "What is my attendance?"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert att_response.status_code == 200, att_response.text
    att_data = att_response.json()
    assert att_data["intent"] == "progress_query"
    assert "80" in att_data["response"]
    att_tamil_chars = re.findall(r"[\u0b80-\u0bff]", att_data["response"])
    assert len(att_tamil_chars) > 5, "Attendance response is not translated to Tamil"


def test_chatbot_skill_gap_query(client, trainee_environment):
    """Confirm skill gap message routes to skill_gap_query and produces natural answer."""
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "What are my missing skill gaps?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "skill_gap_query"
    assert any(w in data["response"].lower() for w in ["skill", "competency", "gap", "analysis"])


def test_chatbot_career_query(client, trainee_environment):
    """Confirm job/career message routes to career_query."""
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "Are there any job opportunities for me?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "career_query"
    assert any(w in data["response"].lower() for w in ["job", "career", "posting", "opportunity"])


def test_chatbot_certificate_query(client, trainee_environment):
    """Confirm certificate query routes to certificate_query."""
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "Can you check my certificate status?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "certificate_query"
    assert "certificate" in data["response"].lower()


def test_chatbot_schedule_query(client, trainee_environment):
    """Confirm schedule/class query returns enrolled training schedule."""
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "When is my next class schedule?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "training_schedule_query"
    assert any(w in data["response"].lower() for w in ["schedule", "training", "curriculum", "session"])


def test_chatbot_general_chat(client, trainee_environment):
    """Confirm default fallback routes to general_chat."""
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "Hello, how can you help me today?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "general_chat"


def test_chatbot_auth_required(client):
    """Confirm chatbot endpoint rejects unauthenticated requests."""
    response = client.post(
        "/api/chatbot/message",
        json={"message": "attendance"}
    )
    assert response.status_code in [401, 403]


def test_chatbot_fallback_mode_forced(client, trainee_environment, monkeypatch):
    """Confirm FALLBACK_MODE=true causes rule-based raw backend response with is_fallback=True."""
    monkeypatch.setenv("FALLBACK_MODE", "true")
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "What is my attendance?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "progress_query"
    assert data["is_fallback"] is True
    # In fallback mode, raw backend string is returned
    assert "Your attendance is 80%" in data["response"]


def test_chatbot_bad_api_key_simulation(client, trainee_environment, monkeypatch):
    """Confirm bad API key causes Gemini exception and falls back to raw data with is_fallback=True."""
    monkeypatch.delenv("FALLBACK_MODE", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "bad_api_key_simulation")
    token = trainee_environment["token"]

    response = client.post(
        "/api/chatbot/message",
        json={"message": "What is my attendance?"},
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["intent"] == "progress_query"
    assert data["is_fallback"] is True
    assert "80%" in data["response"]

