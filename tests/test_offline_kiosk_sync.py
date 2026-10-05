import os
import sys
import tempfile
import pytest

# Ensure scripts directory is in path
SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from kiosk_simulator import (
    init_db,
    queue_offline_record,
    get_queued_records,
    remove_synced_records,
    mark_attendance_local_first,
    sync_batch_from_sqlite,
)
from app.models import Attendance, UserRole, User, TraineeProfile, TrainingProgramme, Institution
from app.security import hash_password

@pytest.fixture
def offline_kiosk_env(db_session, client):
    # Setup test trainee
    trainee = User(
        name="Sunita Rao",
        email="sunita.kiosk@ncct.edu",
        hashed_password=hash_password("Password123!"),
        role=UserRole.TRAINEE
    )
    db_session.add(trainee)
    db_session.commit()
    db_session.refresh(trainee)

    profile = TraineeProfile(
        user_id=trainee.id,
        trainee_id="NCCT-TR-2026-99999",
        institution="VAMNICOM Pune",
        course_enrolled="Cooperative Accounting"
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    # Temporary SQLite DB for offline testing
    fd, temp_db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    init_db(temp_db_path)

    yield {
        "trainee": trainee,
        "profile": profile,
        "db_path": temp_db_path,
        "client": client
    }

    if os.path.exists(temp_db_path):
        try:
            os.remove(temp_db_path)
        except OSError:
            pass


def test_kiosk_offline_queueing_on_server_failure(offline_kiosk_env):
    """
    Simulates server offline (unreachable port/url) and confirms:
    1. Scan does not fail silently.
    2. Returns 'OFFLINE_QUEUED' status.
    3. Queues record in local SQLite database.
    """
    env = offline_kiosk_env
    qr = env["profile"].trainee_id

    # Point to non-existent server port (simulate killed backend)
    dead_backend_url = "http://127.0.0.1:59999"

    res = mark_attendance_local_first(
        trainee_qr_code=qr,
        device_id="ESP32-S3-SIM-OFFLINE",
        session_id="SESSION-OFFLINE-TEST",
        backend_url=dead_backend_url,
        db_path=env["db_path"]
    )

    assert res["status"] == "OFFLINE_QUEUED"
    assert res["is_offline"] is True
    assert res["buzzer"] == "BEEP_WARN"
    assert "Offline - Queued" in res["message"]

    # Verify record is in SQLite
    queued = get_queued_records(env["db_path"])
    assert len(queued) == 1
    assert queued[0]["trainee_qr_code"] == qr
    assert queued[0]["session_id"] == "SESSION-OFFLINE-TEST"


def test_kiosk_batch_sync_and_idempotency(offline_kiosk_env, client):
    """
    Simulates auto-sync when server comes back online:
    1. Reads queued items from SQLite.
    2. Sends batch to /api/attendance/sync-batch.
    3. Clears local queue on success.
    4. Re-syncs identical batch to confirm duplicate records are skipped without error.
    """
    env = offline_kiosk_env
    qr = env["profile"].trainee_id

    # Insert 2 records into SQLite queue (1 valid, 1 duplicate in batch)
    fixed_ts = "2026-09-27T10:00:00Z"
    queue_offline_record("ESP32-S3-SIM-01", qr, "SESSION-RECONNECT-01", fixed_ts, env["db_path"])
    queue_offline_record("ESP32-S3-SIM-01", qr, "SESSION-RECONNECT-01", fixed_ts, env["db_path"])

    queued = get_queued_records(env["db_path"])
    assert len(queued) == 2

    # Perform batch sync via the API endpoint
    batch_payload = {
        "records": [
            {
                "device_id": r["device_id"],
                "trainee_qr_code": r["trainee_qr_code"],
                "session_id": r["session_id"],
                "timestamp": r["timestamp"]
            }
            for r in queued
        ]
    }

    res = client.post("/api/attendance/sync-batch", json=batch_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 1
    assert data["duplicate_count"] == 1

    # Clear from SQLite as done by sync worker
    remove_synced_records([r["id"] for r in queued], env["db_path"])
    remaining = get_queued_records(env["db_path"])
    assert len(remaining) == 0

    # Test idempotency: Re-submitting the exact same batch again produces 0 new records and 100% duplicate skips
    res_repeat = client.post("/api/attendance/sync-batch", json=batch_payload)
    assert res_repeat.status_code == 200
    data_repeat = res_repeat.json()
    assert data_repeat["synced_count"] == 0
    assert data_repeat["duplicate_count"] == 2
