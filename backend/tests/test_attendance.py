import pytest
from app.models import User, UserRole, TraineeProfile, Institution, TrainingProgramme
from app.security import hash_password

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

@pytest.fixture
def setup_attendance_environment(db_session, client):
    trainee = User(
        name="Vikram Sharma",
        email="vikram.att@ncct.edu",
        hashed_password=hash_password("Password123!"),
        role=UserRole.TRAINEE
    )
    trainer = User(
        name="Dr. Ananya Trainer",
        email="trainer.att@ncct.edu",
        hashed_password=hash_password("Password123!"),
        role=UserRole.TRAINER
    )
    db_session.add_all([trainee, trainer])
    db_session.commit()
    db_session.refresh(trainee)
    db_session.refresh(trainer)

    profile = TraineeProfile(
        user_id=trainee.id,
        trainee_id="NCCT-TR-2026-77777",
        institution="VAMNICOM Pune",
        course_enrolled="Cooperative Accounting"
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    inst = Institution(name="VAMNICOM Pune", code="VAMNICOM", location="Pune")
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

    trainee_token = get_auth_token(client, "vikram.att@ncct.edu", "Password123!")
    trainer_token = get_auth_token(client, "trainer.att@ncct.edu", "Password123!")

    return {
        "trainee": trainee,
        "trainer": trainer,
        "profile": profile,
        "programme": prog,
        "trainee_token": trainee_token,
        "trainer_token": trainer_token
    }


def test_mark_attendance_valid(client, setup_attendance_environment):
    env = setup_attendance_environment
    qr_code = env["profile"].trainee_id

    res = client.post("/api/attendance/mark", json={
        "device_id": "KIOSK-SIM-01",
        "trainee_qr_code": qr_code,
        "session_id": "SESSION-DAY-01",
        "programme_id": env["programme"].id
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OK"
    assert data["buzzer"] == "BEEP_SUCCESS"
    assert data["trainee_id"] == qr_code
    assert data["trainee_name"] == "Vikram Sharma"
    assert data["attendance_id"] is not None


def test_mark_attendance_duplicate(client, setup_attendance_environment):
    env = setup_attendance_environment
    qr_code = env["profile"].trainee_id

    # First mark: OK
    client.post("/api/attendance/mark", json={
        "device_id": "KIOSK-SIM-01",
        "trainee_qr_code": qr_code,
        "session_id": "SESSION-DAY-02",
        "programme_id": env["programme"].id
    })

    # Second mark same day and session: DUPLICATE
    res2 = client.post("/api/attendance/mark", json={
        "device_id": "KIOSK-SIM-01",
        "trainee_qr_code": qr_code,
        "session_id": "SESSION-DAY-02",
        "programme_id": env["programme"].id
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "DUPLICATE"
    assert data2["buzzer"] == "BEEP_WARN"
    assert "already marked" in data2["message"].lower()


def test_mark_attendance_invalid(client, setup_attendance_environment):
    res = client.post("/api/attendance/mark", json={
        "device_id": "KIOSK-SIM-01",
        "trainee_qr_code": "INVALID-QR-NONEXISTENT",
        "session_id": "SESSION-DAY-01"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "INVALID"
    assert data["buzzer"] == "BEEP_ERROR"
    assert data["trainee_id"] is None


def test_sync_batch_attendance(client, setup_attendance_environment):
    env = setup_attendance_environment
    qr_code = env["profile"].trainee_id

    payload = {
        "records": [
            {
                "device_id": "ESP32-S3-GATE-01",
                "trainee_qr_code": qr_code,
                "timestamp": "2026-09-27T08:30:00Z",
                "session_id": "SESSION-BATCH-TEST"
            },
            {
                "device_id": "ESP32-S3-GATE-01",
                "trainee_qr_code": qr_code,  # Duplicate of above
                "timestamp": "2026-09-27T08:31:00Z",
                "session_id": "SESSION-BATCH-TEST"
            },
            {
                "device_id": "ESP32-S3-GATE-01",
                "trainee_qr_code": "NCCT-UNKNOWN-9999",  # Invalid
                "timestamp": "2026-09-27T08:32:00Z",
                "session_id": "SESSION-BATCH-TEST"
            }
        ]
    }

    res = client.post("/api/attendance/sync-batch", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 1
    assert data["duplicate_count"] == 1
    assert data["invalid_count"] == 1
    assert len(data["results"]) == 3
    assert data["results"][0]["synced_from"] == "hardware"


def test_trainee_attendance_history_and_session_view(client, setup_attendance_environment):
    env = setup_attendance_environment
    qr_code = env["profile"].trainee_id
    headers = {"Authorization": f"Bearer {env['trainee_token']}"}

    # Mark attendance for 2 sessions
    client.post("/api/attendance/mark", json={
        "device_id": "KIOSK-SIM-01",
        "trainee_qr_code": qr_code,
        "session_id": "SESSION-101"
    })
    client.post("/api/attendance/mark", json={
        "device_id": "KIOSK-SIM-01",
        "trainee_qr_code": qr_code,
        "session_id": "SESSION-102"
    })

    # Query trainee history
    res = client.get(f"/api/attendance/trainee/{qr_code}", headers=headers)
    assert res.status_code == 200
    t_data = res.json()
    assert t_data["trainee_id"] == qr_code
    assert t_data["attended_sessions"] >= 2
    assert t_data["attendance_percentage"] > 0
    assert len(t_data["records"]) >= 2

    # Query session view for trainer
    trainer_headers = {"Authorization": f"Bearer {env['trainer_token']}"}
    res_sess = client.get("/api/attendance/session/SESSION-101", headers=trainer_headers)
    assert res_sess.status_code == 200
    s_data = res_sess.json()
    assert s_data["session_id"] == "SESSION-101"
    assert s_data["total_marked"] >= 1
    assert s_data["attendees"][0]["trainee_id"] == qr_code


def test_sync_batch_idempotency_exact_duplicates(client, setup_attendance_environment):
    """
    Verifies that batch sync is strictly idempotent:
    1. A batch containing duplicate records (same trainee_id + session_id + timestamp) inserts only once.
    2. Re-submitting the exact same batch again yields 100% duplicate skips and 0 new inserts.
    """
    env = setup_attendance_environment
    qr_code = env["profile"].trainee_id

    batch_payload = {
        "records": [
            {
                "device_id": "KIOSK-SIM-01",
                "trainee_qr_code": qr_code,
                "timestamp": "2026-09-27T09:00:00Z",
                "session_id": "SESSION-IDEMPOTENT-01"
            },
            {
                "device_id": "KIOSK-SIM-01",
                "trainee_qr_code": qr_code,
                "timestamp": "2026-09-27T09:00:00Z",  # Exact duplicate
                "session_id": "SESSION-IDEMPOTENT-01"
            }
        ]
    }

    # First batch submission: 1 synced, 1 duplicate
    res1 = client.post("/api/attendance/sync-batch", json=batch_payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["synced_count"] == 1
    assert data1["duplicate_count"] == 1
    assert data1["invalid_count"] == 0

    # Second batch submission (re-sync identical batch): 0 synced, 2 duplicates (100% skipped)
    res2 = client.post("/api/attendance/sync-batch", json=batch_payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["synced_count"] == 0
    assert data2["duplicate_count"] == 2
    assert data2["invalid_count"] == 0

