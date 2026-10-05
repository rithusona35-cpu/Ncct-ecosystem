import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.models import (
    User, UserRole, TraineeProfile, Skill, TrainingProgramme,
    Assessment, AssessmentResult, JobRole, JobPosting, SkillPassport
)
from app.services.skill_gap_engine import ensure_default_job_roles
from app.services.matching_service import get_candidates_for_job


def get_token_for_user(client: TestClient, email: str, role: str, name: str):
    client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role
    })
    resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"], resp.json()["user"]["id"]


def test_candidate_matching_cooperative_accountant(client, db_session):
    """
    Tests get_candidates_for_job and GET /api/employer/job-postings/{id}/matches:
    - Cooperative Accountant requires:
        Accounting (HIGH, 70%), ERP (MEDIUM, 60%), GST (MEDIUM, 60%)
    - Ravi Kumar has:
        Accounting: 88.0% (Matched)
        ERP: 92.0% (Matched)
        GST: 48.0% (Gap)
    - Expected:
        match_percentage: 66.7%
        matched_skills: ["Accounting", "ERP"]
        gap_skills: ["GST"]
    """
    ensure_default_job_roles(db_session)

    # 1. Ensure Skills exist
    acc_skill = db_session.query(Skill).filter(Skill.name == "Accounting").first()
    erp_skill = db_session.query(Skill).filter(Skill.name == "ERP").first()
    gst_skill = db_session.query(Skill).filter(Skill.name == "GST").first()
    assert acc_skill and erp_skill and gst_skill

    # 2. Setup Trainee Ravi Kumar with Profile & Skill Passport
    ravi_token, ravi_id = get_token_for_user(client, "ravi.matching@ncct.edu", "TRAINEE", "Ravi Kumar")
    
    # Trainee Profile
    client.post(
        "/api/trainee/profile",
        headers={"Authorization": f"Bearer {ravi_token}"},
        json={
            "institution": "National Institute of Cooperative Management",
            "course_enrolled": "Cooperative Accounting",
            "education": "B.Com",
            "preferred_language": "English",
            "previous_skills": ["Tally", "Bookkeeping"]
        }
    )

    # Ensure SkillPassport record
    passport = db_session.query(SkillPassport).filter(SkillPassport.trainee_id == ravi_id).first()
    if not passport:
        passport = SkillPassport(
            trainee_id=ravi_id,
            passport_code="NCCT-SP-RAVI-001",
            created_at=datetime.utcnow()
        )
        db_session.add(passport)
        db_session.commit()

    # Create dummy course & assessment to store AssessmentResult with exact skill scores
    prog = db_session.query(TrainingProgramme).first()
    if not prog:
        inst = db_session.query(User).first()
        prog = TrainingProgramme(
            title="Cooperative Accounting & ERP",
            institution_id=1,
            trainer_id=1,
            start_date=datetime.utcnow()
        )
        db_session.add(prog)
        db_session.commit()
        db_session.refresh(prog)

    assessment = Assessment(
        course_id=prog.id,
        title="Comprehensive Cooperative Accounting Assessment",
        type="practical"
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)

    # Seed Ravi's per-skill scores: Accounting=88%, ERP=92%, GST=48%
    result = AssessmentResult(
        trainee_id=ravi_id,
        assessment_id=assessment.id,
        overall_score=76.0,
        total_marks_earned=76,
        total_marks_possible=100,
        skill_wise_score={
            str(acc_skill.id): {"skill_id": acc_skill.id, "skill_name": "Accounting", "percentage": 88.0},
            str(erp_skill.id): {"skill_id": erp_skill.id, "skill_name": "ERP", "percentage": 92.0},
            str(gst_skill.id): {"skill_id": gst_skill.id, "skill_name": "GST", "percentage": 48.0},
        },
        submitted_at=datetime.utcnow()
    )
    db_session.add(result)
    db_session.commit()

    # 3. Setup Employer & Post "Cooperative Accountant" Job
    emp_token, emp_id = get_token_for_user(client, "hr.lead@statecoop.bank", "EMPLOYER", "State Cooperative Bank HR")

    coop_accountant_role = db_session.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()
    assert coop_accountant_role is not None

    post_resp = client.post(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "job_role_id": coop_accountant_role.id,
            "title": "Cooperative Accountant (PACS Ledgers)",
            "description": "Looking for accountant with strong double-entry and ERP skills.",
            "location": "Ahmedabad / Surat"
        }
    )
    assert post_resp.status_code == 201
    job_id = post_resp.json()["id"]

    # 4. Direct service unit test
    candidates = get_candidates_for_job(job_id, db_session)
    assert len(candidates) >= 1
    ravi_match = next((c for c in candidates if c["name"] == "Ravi Kumar"), None)
    assert ravi_match is not None
    assert ravi_match["match_percentage"] == 66.7
    assert set(ravi_match["matched_skills"]) == {"Accounting", "ERP"}
    assert set(ravi_match["gap_skills"]) == {"GST"}

    # 5. API Endpoint Test: GET /api/employer/job-postings/{id}/matches
    matches_resp = client.get(
        f"/api/employer/job-postings/{job_id}/matches",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert matches_resp.status_code == 200, f"Matches endpoint failed: {matches_resp.text}"
    api_candidates = matches_resp.json()
    assert isinstance(api_candidates, list)
    assert len(api_candidates) >= 1

    api_ravi = next((c for c in api_candidates if c["name"] == "Ravi Kumar"), None)
    assert api_ravi is not None
    assert api_ravi["match_percentage"] == 66.7
    assert set(api_ravi["matched_skills"]) == {"Accounting", "ERP"}
    assert set(api_ravi["gap_skills"]) == {"GST"}


def test_candidate_matching_ownership_and_unauthorized(client, db_session):
    """
    Verifies that an employer cannot view matches for another employer's posting,
    and trainees/unauthenticated callers are rejected.
    """
    ensure_default_job_roles(db_session)
    role = db_session.query(JobRole).first()

    emp1_token, _ = get_token_for_user(client, "emp.owner1@bank.coop", "EMPLOYER", "Bank 1 HR")
    emp2_token, _ = get_token_for_user(client, "emp.owner2@bank.coop", "EMPLOYER", "Bank 2 HR")
    trainee_token, _ = get_token_for_user(client, "intruder.trainee@ncct.edu", "TRAINEE", "Intruder")

    # Employer 1 creates job
    create_resp = client.post(
        "/api/employer/job-postings",
        headers={"Authorization": f"Bearer {emp1_token}"},
        json={"job_role_id": role.id, "title": "Secret Job Posting"}
    )
    assert create_resp.status_code == 201
    job_id = create_resp.json()["id"]

    # Employer 2 attempts to view matches -> 403 Forbidden
    forbidden_resp = client.get(
        f"/api/employer/job-postings/{job_id}/matches",
        headers={"Authorization": f"Bearer {emp2_token}"}
    )
    assert forbidden_resp.status_code == 403

    # Trainee attempts to view matches -> 403 Forbidden
    trainee_resp = client.get(
        f"/api/employer/job-postings/{job_id}/matches",
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert trainee_resp.status_code == 403

    # Unauthenticated caller -> 401 Unauthorized
    unauth_resp = client.get(f"/api/employer/job-postings/{job_id}/matches")
    assert unauth_resp.status_code == 401
