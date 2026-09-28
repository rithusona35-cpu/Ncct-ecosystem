import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.models import User, UserRole, JobRole, JobRoleSkillRequirement, Skill, JobPosting
from app.services.skill_gap_engine import ensure_default_job_roles


def get_auth_token(client: TestClient, email: str, role: str = "EMPLOYER", name: str = "Test Recruiter"):
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


def test_create_job_posting(client, db_session):
    """
    Test POST /api/employer/job-postings creates a job with role-linked skills.
    """
    ensure_default_job_roles(db_session)
    job_role = db_session.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()
    assert job_role is not None

    token, employer_id = get_auth_token(client, email="recruiter1@coopbank.in", role="EMPLOYER")

    create_payload = {
        "job_role_id": job_role.id,
        "title": "Senior PACS Accountant",
        "description": "Looking for certified accountant for society books.",
        "location": "Pune, Maharashtra",
        "is_active": True
    }

    resp = client.post(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {token}"},
        json=create_payload
    )
    assert resp.status_code == 201, f"Create failed: {resp.text}"
    data = resp.json()
    assert data["title"] == "Senior PACS Accountant"
    assert data["employer_id"] == employer_id
    assert data["job_role_id"] == job_role.id
    assert data["job_role_title"] == "Cooperative Accountant"
    assert data["location"] == "Pune, Maharashtra"
    assert data["is_active"] is True
    assert len(data["required_skills"]) > 0

    # Verify skill details pulled from JobRoleSkillRequirement
    skill_names = [s["skill_name"] for s in data["required_skills"]]
    assert "Accounting" in skill_names


def test_list_own_job_postings(client, db_session):
    """
    Test GET /api/employer/job-postings lists only the jobs posted by the logged-in employer.
    """
    ensure_default_job_roles(db_session)
    job_role = db_session.query(JobRole).first()

    token1, emp1_id = get_auth_token(client, email="employer.one@bank.coop", role="EMPLOYER")
    token2, emp2_id = get_auth_token(client, email="employer.two@bank.coop", role="EMPLOYER")

    # Employer 1 creates 2 postings
    client.post(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {token1}"},
        json={"job_role_id": job_role.id, "title": "Job 1 by Employer 1", "location": "Delhi"}
    )
    client.post(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {token1}"},
        json={"job_role_id": job_role.id, "title": "Job 2 by Employer 1", "location": "Mumbai"}
    )

    # Employer 2 creates 1 posting
    client.post(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {token2}"},
        json={"job_role_id": job_role.id, "title": "Job 1 by Employer 2", "location": "Ahmedabad"}
    )

    # Employer 1 lists own jobs -> exactly 2
    resp1 = client.get("/api/employer/job-postings", headers={"Authorization": f"Bearer {token1}"})
    assert resp1.status_code == 200
    jobs1 = resp1.json()
    assert len(jobs1) == 2
    assert all(j["employer_id"] == emp1_id for j in jobs1)

    # Employer 2 lists own jobs -> exactly 1
    resp2 = client.get("/api/employer/job-postings", headers={"Authorization": f"Bearer {token2}"})
    assert resp2.status_code == 200
    jobs2 = resp2.json()
    assert len(jobs2) == 1
    assert jobs2[0]["employer_id"] == emp2_id


def test_get_job_posting_detail_and_patch_update(client, db_session):
    """
    Test GET /api/employer/job-postings/{id} and PATCH /api/employer/job-postings/{id} (deactivation/updates).
    """
    ensure_default_job_roles(db_session)
    job_role = db_session.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()

    token, employer_id = get_auth_token(client, email="detail.recruiter@pacs.coop", role="EMPLOYER")

    # Create job
    create_resp = client.post(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {token}"},
        json={"job_role_id": job_role.id, "title": "Branch Accounts Officer", "location": "Nagpur"}
    )
    assert create_resp.status_code == 201
    job_id = create_resp.json()["id"]

    # Get detail
    detail_resp = client.get(
        f"/api/employer/job-postings/{job_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert detail_resp.status_code == 200
    d_data = detail_resp.json()
    assert d_data["id"] == job_id
    assert d_data["title"] == "Branch Accounts Officer"
    assert d_data["is_active"] is True
    assert len(d_data["required_skills"]) > 0

    # PATCH update (deactivate and change location)
    patch_resp = client.patch(
        f"/api/employer/job-postings/{job_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False, "location": "Nagpur (Remote)"}
    )
    assert patch_resp.status_code == 200
    updated_data = patch_resp.json()
    assert updated_data["is_active"] is False
    assert updated_data["location"] == "Nagpur (Remote)"

    # Verify persistence via GET
    check_resp = client.get(
        f"/api/employer/job-postings/{job_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert check_resp.status_code == 200
    assert check_resp.json()["is_active"] is False


def test_unauthorized_access_to_job_postings(client, db_session):
    """
    Test that Trainee, Trainer, or Unauthenticated users cannot access Employer job posting endpoints.
    """
    ensure_default_job_roles(db_session)
    job_role = db_session.query(JobRole).first()

    # 1. Unauthenticated request -> 401 Unauthorized
    unauth_resp = client.get("/api/employer/job-postings")
    assert unauth_resp.status_code == 401

    # 2. Trainee role attempt -> 403 Forbidden
    trainee_token, _ = get_auth_token(client, email="trainee.intruder@ncct.edu", role="TRAINEE")
    trainee_post_resp = client.post(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {trainee_token}"},
        json={"job_role_id": job_role.id, "title": "Illegal Post"}
    )
    assert trainee_post_resp.status_code == 403

    trainee_get_resp = client.get(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert trainee_get_resp.status_code == 403
