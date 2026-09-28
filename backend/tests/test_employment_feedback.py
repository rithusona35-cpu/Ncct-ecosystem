import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.models import User, UserRole, JobRole, Skill, JobPosting, EmploymentRecord, EmployerFeedback, TraineeProfile
from app.services.skill_gap_engine import ensure_default_job_roles


def get_auth_token(client: TestClient, email: str, role: str = "EMPLOYER", name: str = "Test User"):
    # Register user
    client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role
    })
    # Login
    login_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_resp.status_code == 200, f"Login failed for {email}: {login_resp.text}"
    return login_resp.json()["access_token"], login_resp.json()["user"]["id"]


@pytest.fixture
def setup_employment_fixtures(client, db_session):
    ensure_default_job_roles(db_session)

    # 1. Employer 1
    emp1_token, emp1_id = get_auth_token(client, email="employer1@khedut.coop", role="EMPLOYER", name="Khedut Bank Recruiter")
    
    # 2. Employer 2
    emp2_token, emp2_id = get_auth_token(client, email="employer2@amul.coop", role="EMPLOYER", name="Amul Dairy Recruiter")

    # 3. Trainee
    trainee_token, trainee_id = get_auth_token(client, email="candidate.ravi@ncct.edu", role="TRAINEE", name="Ravi Kumar")
    
    # Ensure trainee profile
    profile = db_session.query(TraineeProfile).filter(TraineeProfile.user_id == trainee_id).first()
    if not profile:
        profile = TraineeProfile(
            user_id=trainee_id,
            trainee_id="NCCT-TR-RAVI-001",
            institution="VAMNICOM",
            course_enrolled="Diploma in Cooperative Banking",
            previous_skills=["Accounting", "ERP"]
        )
        db_session.add(profile)
        db_session.commit()

    # 4. Job Role & Job Posting for Employer 1
    role = db_session.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()
    assert role is not None

    job = JobPosting(
        employer_id=emp1_id,
        job_role_id=role.id,
        title="Junior Society Accountant",
        description="Full time accountant position.",
        location="Anand, Gujarat",
        is_active=True
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    # 5. Skills
    skills = db_session.query(Skill).all()
    assert len(skills) >= 3, "At least 3 skills should exist in DB"

    return {
        "emp1_token": emp1_token,
        "emp1_id": emp1_id,
        "emp2_token": emp2_token,
        "emp2_id": emp2_id,
        "trainee_token": trainee_token,
        "trainee_id": trainee_id,
        "trainee_code": profile.trainee_id,
        "job_id": job.id,
        "skills": skills
    }


def test_create_and_list_employment_record(client, setup_employment_fixtures, db_session):
    """
    Test POST /api/employer/employment-records creates a hire record
    and GET /api/employer/employment-records lists it.
    """
    f = setup_employment_fixtures

    # POST /api/employer/employment-records using trainee string code
    hire_resp = client.post(
        "/api/employer/employment-records",
        headers={"Authorization": f"Bearer {f['emp1_token']}"},
        json={
            "trainee_id": f["trainee_code"],
            "job_posting_id": f["job_id"],
            "status": "ACTIVE"
        }
    )
    assert hire_resp.status_code == 201, f"Hire failed: {hire_resp.text}"
    hire_data = hire_resp.json()
    assert hire_data["trainee_id"] == f["trainee_id"]
    assert hire_data["trainee_name"] == "Ravi Kumar"
    assert hire_data["employer_id"] == f["emp1_id"]
    assert hire_data["job_posting_id"] == f["job_id"]
    assert hire_data["status"] == "ACTIVE"
    assert "hired_date" in hire_data

    record_id = hire_data["id"]

    # GET /api/employer/employment-records
    list_resp = client.get(
        "/api/employer/employment-records",
        headers={"Authorization": f"Bearer {f['emp1_token']}"}
    )
    assert list_resp.status_code == 200
    records = list_resp.json()
    assert len(records) >= 1
    found = any(r["id"] == record_id for r in records)
    assert found is True


def test_submit_and_fetch_employer_feedback_with_3_skills(client, setup_employment_fixtures, db_session):
    """
    Test POST /api/employer/feedback submits skill ratings for 3 skills,
    and GET /api/employer/employment-records/{id}/feedback retrieves them.
    """
    f = setup_employment_fixtures

    # Create hire record first
    hire_resp = client.post(
        "/api/employer/employment-records",
        headers={"Authorization": f"Bearer {f['emp1_token']}"},
        json={
            "trainee_id": f["trainee_id"],
            "job_posting_id": f["job_id"],
            "status": "ACTIVE"
        }
    )
    assert hire_resp.status_code == 201
    record_id = hire_resp.json()["id"]

    # Pick 3 skills
    s1, s2, s3 = f["skills"][0], f["skills"][1], f["skills"][2]

    # Feedback payload with 3 skills
    feedback_payload = {
        "employment_record_id": record_id,
        "feedback": [
            {"skill_id": s1.id, "rating": "HIGH", "comments": "Outstanding ledger accuracy and audit readiness."},
            {"skill_id": s2.id, "rating": "GOOD", "comments": "Solid ERP navigation and batch reconciliation."},
            {"skill_id": s3.id, "rating": "MEDIUM", "comments": "Understands basics, requires minor GST supervision."}
        ]
    }

    fb_resp = client.post(
        "/api/employer/feedback",
        headers={"Authorization": f"Bearer {f['emp1_token']}"},
        json=feedback_payload
    )
    assert fb_resp.status_code == 201, f"Submit feedback failed: {fb_resp.text}"
    fb_data = fb_resp.json()
    assert len(fb_data) == 3

    ratings_map = {item["skill_id"]: item for item in fb_data}
    assert ratings_map[s1.id]["rating"] == "HIGH"
    assert ratings_map[s1.id]["comments"] == "Outstanding ledger accuracy and audit readiness."
    assert ratings_map[s2.id]["rating"] == "GOOD"
    assert ratings_map[s3.id]["rating"] == "MEDIUM"

    # Fetch feedback back via GET /api/employer/employment-records/{id}/feedback
    get_resp = client.get(
        f"/api/employer/employment-records/{record_id}/feedback",
        headers={"Authorization": f"Bearer {f['emp1_token']}"}
    )
    assert get_resp.status_code == 200, f"Get feedback failed: {get_resp.text}"
    retrieved = get_resp.json()
    assert len(retrieved) == 3
    retrieved_skills = {r["skill_id"]: r["rating"] for r in retrieved}
    assert retrieved_skills[s1.id] == "HIGH"
    assert retrieved_skills[s2.id] == "GOOD"
    assert retrieved_skills[s3.id] == "MEDIUM"


def test_unauthorized_employer_feedback_forbidden_403(client, setup_employment_fixtures, db_session):
    """
    Verify that an employer cannot submit or view feedback for another employer's hire (403 Forbidden).
    """
    f = setup_employment_fixtures

    # Employer 1 hires candidate
    hire_resp = client.post(
        "/api/employer/employment-records",
        headers={"Authorization": f"Bearer {f['emp1_token']}"},
        json={
            "trainee_id": f["trainee_id"],
            "job_posting_id": f["job_id"],
            "status": "ACTIVE"
        }
    )
    assert hire_resp.status_code == 201
    record_id = hire_resp.json()["id"]

    s1 = f["skills"][0]

    # Employer 2 tries to submit feedback for Employer 1's hire -> 403 Forbidden
    unauth_submit = client.post(
        "/api/employer/feedback",
        headers={"Authorization": f"Bearer {f['emp2_token']}"},
        json={
            "employment_record_id": record_id,
            "feedback": [
                {"skill_id": s1.id, "rating": "HIGH", "comments": "Malicious feedback attempt"}
            ]
        }
    )
    assert unauth_submit.status_code == 403, f"Expected 403 but got: {unauth_submit.status_code}"
    assert "permission" in unauth_submit.json()["detail"].lower()

    # Employer 2 tries to view feedback for Employer 1's hire -> 403 Forbidden
    unauth_get = client.get(
        f"/api/employer/employment-records/{record_id}/feedback",
        headers={"Authorization": f"Bearer {f['emp2_token']}"}
    )
    assert unauth_get.status_code == 403, f"Expected 403 but got: {unauth_get.status_code}"
    assert "permission" in unauth_get.json()["detail"].lower()


def test_cannot_hire_for_another_employers_job_posting(client, setup_employment_fixtures):
    """
    Verify an employer cannot mark a candidate as hired on another employer's job posting (403 Forbidden).
    """
    f = setup_employment_fixtures

    # Employer 2 tries to hire on Employer 1's job posting
    resp = client.post(
        "/api/employer/employment-records",
        headers={"Authorization": f"Bearer {f['emp2_token']}"},
        json={
            "trainee_id": f["trainee_id"],
            "job_posting_id": f["job_id"],
            "status": "ACTIVE"
        }
    )
    assert resp.status_code == 403
    assert "permission" in resp.json()["detail"].lower()
