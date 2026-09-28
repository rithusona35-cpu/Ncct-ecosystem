"""
NCCT Ecosystem: End-to-End (E2E) Diagnostic Lifecycle Test Suite (Phase 16b)
Validates the complete end-to-end user journey across all roles and services:
1. Multi-role Authentication (Admin, Trainer 1, Employer 1, Trainee Ravi)
2. Trainee Profile & Course Access
3. LMS Course Progress (100% completion)
4. Attendance Tracking (~88.9%, 8/9 sessions)
5. Skill-Tagged Assessment & Results (Acc=88%, ERP=52%, GST=48%, Comm=65%, Excel=85%)
6. Certificate Auto-Issuance, Public QR Verification, and PDF Generation
7. Dynamic Skill Passport Generation
8. AI Skill-Gap Analysis & Course Recommendations
9. Employer Job Postings & Candidate Matching (Ravi Kumar matched)
10. Employment Record & Hiring
11. Employer Skill Feedback Submission
12. Admin Analytics & Ecosystem Overview
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models import (
    User, TraineeProfile, TrainingProgramme, Module, ContentItem,
    Assessment, AssessmentResult, JobRole, JobPosting, Skill,
    Certificate, EmploymentRecord, EmployerFeedback
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def tokens():
    """
    Authenticates all 4 primary actors seeded in Phase 16a.
    """
    actors = {
        "admin": ("admin@ncct.gov.in", "admin123"),
        "trainer": ("trainer1@ncct.gov.in", "trainer123"),
        "employer": ("employer1@example.com", "employer123"),
        "trainee": ("ravi.kumar@example.com", "trainee123"),
    }
    auth_data = {}
    for role, (email, password) in actors.items():
        resp = client.post("/api/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200, f"Login failed for {role} ({email}): {resp.text}"
        data = resp.json()
        auth_data[role] = {
            "token": data["access_token"],
            "user": data["user"]
        }
    return auth_data


# ============================================================================
# 1. Multi-Role Authentication & RBAC Verification
# ============================================================================
def test_01_authentication_all_roles(tokens):
    assert tokens["admin"]["user"]["role"] == "ADMIN"
    assert tokens["trainer"]["user"]["role"] == "TRAINER"
    assert tokens["employer"]["user"]["role"] == "EMPLOYER"
    assert tokens["trainee"]["user"]["role"] == "TRAINEE"
    assert tokens["trainee"]["user"]["name"] == "Ravi Kumar"


# ============================================================================
# 2. Trainee Profile Verification
# ============================================================================
def test_02_trainee_profile(tokens):
    headers = {"Authorization": f"Bearer {tokens['trainee']['token']}"}
    resp = client.get("/api/trainee/profile/me", headers=headers)
    assert resp.status_code == 200, f"Failed to get trainee profile: {resp.text}"
    profile = resp.json()

    assert profile["name"] == "Ravi Kumar"
    assert profile["institution"] == "Regional Cooperative Training Institute, Chennai"
    assert profile["course_enrolled"] == "Cooperative Accounting and Digital ERP"
    assert profile["education"] == "B.Com"
    assert profile["preferred_language"] == "Tamil"
    assert "Basic Accounting" in profile.get("previous_skills", [])


# ============================================================================
# 3. Training Programme & Module Structure
# ============================================================================
def test_03_training_programme_and_modules(tokens, db):
    programme = db.query(TrainingProgramme).filter(
        TrainingProgramme.title == "Cooperative Accounting and Digital ERP"
    ).order_by(TrainingProgramme.id.desc()).first()
    assert programme is not None, "Seeded programme not found"

    headers = {"Authorization": f"Bearer {tokens['trainee']['token']}"}
    resp = client.get(f"/api/courses/{programme.id}", headers=headers)
    assert resp.status_code == 200, f"Failed to fetch course: {resp.text}"
    course_data = resp.json()

    assert course_data["title"] == "Cooperative Accounting and Digital ERP"
    module_titles = [m["title"] for m in course_data.get("modules", [])]
    assert "Accounting Fundamentals" in module_titles
    assert "ERP Systems" in module_titles
    assert "GST & Compliance" in module_titles


# ============================================================================
# 4. LMS Course Progress (100% Completion)
# ============================================================================
def test_04_lms_progress(tokens, db):
    headers = {"Authorization": f"Bearer {tokens['trainee']['token']}"}
    resp = client.get("/api/lms/progress/me", headers=headers)
    assert resp.status_code == 200, f"Failed to get progress: {resp.text}"
    courses = resp.json()
    assert len(courses) >= 1

    # Find the seeded programme course progress (programme id 3)
    seeded_prog = next((c for c in courses if c["programme_title"] == "Cooperative Accounting and Digital ERP" and c["completion_percentage"] == 100), None)
    assert seeded_prog is not None, f"Seeded course not 100% completed: {courses}"
    assert seeded_prog["completion_percentage"] == 100
    assert seeded_prog["completed_items"] == seeded_prog["total_items"]


# ============================================================================
# 5. Attendance Tracking (~88.9%, 8 out of 9 sessions)
# ============================================================================
def test_05_attendance_tracking(tokens):
    headers = {"Authorization": f"Bearer {tokens['trainee']['token']}"}
    resp = client.get("/api/attendance/trainee/me", headers=headers)
    assert resp.status_code == 200, f"Failed to get attendance: {resp.text}"
    att_data = resp.json()

    # Spec: 8 sessions attended out of 9 total sessions (~88.9%)
    assert att_data["attended_sessions"] == 8
    assert att_data["total_sessions"] == 9
    assert round(att_data["attendance_percentage"], 1) == 88.9


# ============================================================================
# 6. Skill-Tagged Assessment & Results (Exact Spec Scores)
# ============================================================================
def test_06_assessment_results(tokens):
    headers = {"Authorization": f"Bearer {tokens['trainee']['token']}"}
    resp = client.get("/api/assessment/trainee/me/skill-scores", headers=headers)
    assert resp.status_code == 200, f"Failed to fetch assessment skill scores: {resp.text}"
    data = resp.json()

    scores_by_name = {s["skill_name"]: s["percentage"] for s in data.get("skills", [])}

    assert scores_by_name.get("Accounting") == 88.0, f"Expected Accounting=88.0, got {scores_by_name.get('Accounting')}"
    assert scores_by_name.get("ERP") == 52.0, f"Expected ERP=52.0, got {scores_by_name.get('ERP')}"
    assert scores_by_name.get("GST") == 48.0, f"Expected GST=48.0, got {scores_by_name.get('GST')}"
    assert scores_by_name.get("Communication") == 65.0, f"Expected Communication=65.0, got {scores_by_name.get('Communication')}"
    assert scores_by_name.get("Excel") == 85.0, f"Expected Excel=85.0, got {scores_by_name.get('Excel')}"


# ============================================================================
# 7. Certificate Auto-Issuance, Public Verification & PDF Generation
# ============================================================================
def test_07_certificate_issuance_and_verification(tokens):
    headers = {"Authorization": f"Bearer {tokens['trainee']['token']}"}
    
    # 7a. Get my certificates (auto-evaluates course completion & assessment passing)
    resp = client.get("/api/certificates/my-certificates", headers=headers)
    assert resp.status_code == 200, f"Failed to get certificates: {resp.text}"
    certs = resp.json()
    assert len(certs) >= 1, "Expected at least 1 issued certificate for Ravi Kumar"

    cert = certs[0]
    cert_id = cert["certificate_id"]
    assert "NCCT-CERT" in cert_id
    assert cert["is_verified"] is True
    assert cert["trainee_name"] == "Ravi Kumar"

    # 7b. Public verification (unauthenticated)
    pub_resp = client.get(f"/api/certificates/verify/{cert_id}")
    assert pub_resp.status_code == 200, f"Public verification failed: {pub_resp.text}"
    pub_data = pub_resp.json()
    assert pub_data["is_valid"] is True
    assert pub_data["certificate"]["trainee_name"] == "Ravi Kumar"

    # 7c. PDF generation endpoint
    pdf_resp = client.get(f"/api/certificates/{cert_id}/pdf")
    assert pdf_resp.status_code == 200, f"PDF download failed: {pdf_resp.text}"
    assert pdf_resp.headers.get("content-type") == "application/pdf"
    assert len(pdf_resp.content) > 1000, "Generated PDF is too small or empty"


# ============================================================================
# 8. Dynamic Skill Passport Generation
# ============================================================================
def test_08_dynamic_skill_passport(tokens):
    headers = {"Authorization": f"Bearer {tokens['trainee']['token']}"}
    resp = client.get("/api/skill-passport/me", headers=headers)
    assert resp.status_code == 200, f"Failed to get skill passport: {resp.text}"
    passport = resp.json()

    assert passport["name"] == "Ravi Kumar"
    assert passport["institution"] == "Regional Cooperative Training Institute, Chennai"
    assert passport["certificates_count"] >= 1

    # Check skill levels: Accounting (Level 4), ERP (Level 2), GST (Level 2), Comm (Level 3), Excel (Level 4)
    skills = {s["skill_name"]: s for s in passport.get("skills", [])}
    assert "Accounting" in skills and skills["Accounting"]["level"] == 4
    assert "Excel" in skills and skills["Excel"]["level"] == 4
    assert "Communication" in skills and skills["Communication"]["level"] == 3
    assert "ERP" in skills and skills["ERP"]["level"] == 2
    assert "GST" in skills and skills["GST"]["level"] == 2


# ============================================================================
# 9. AI Skill-Gap Analysis & Recommendations
# ============================================================================
def test_09_skill_gap_analysis(tokens, db):
    job_role = db.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()
    assert job_role is not None, "JobRole 'Cooperative Accountant' not found"

    headers = {"Authorization": f"Bearer {tokens['trainee']['token']}"}
    
    # 9a. Gap analysis endpoint
    resp = client.get(f"/api/skills/gap-analysis/me/{job_role.id}", headers=headers)
    assert resp.status_code == 200, f"Gap analysis failed: {resp.text}"
    gap_data = resp.json()

    assert gap_data["job_role_title"] == "Cooperative Accountant"
    skills = {s["skill_name"]: s for s in gap_data.get("skills", [])}

    # Accounting (88% vs HIGH=70%) -> Matched
    assert "Accounting" in skills and skills["Accounting"]["gap"] is False
    # ERP (52% vs HIGH=70%) -> Gap
    assert "ERP" in skills and skills["ERP"]["gap"] is True
    # GST (48% vs HIGH=70%) -> Gap
    assert "GST" in skills and skills["GST"]["gap"] is True

    # 9b. Module recommendations
    rec_resp = client.get(f"/api/skills/recommendations/me?job_role_id={job_role.id}", headers=headers)
    assert rec_resp.status_code == 200, f"Recommendations failed: {rec_resp.text}"
    recs = rec_resp.json()
    assert len(recs.get("recommendations", [])) >= 1


# ============================================================================
# 10. Employer Job Posting & Candidate Matching
# ============================================================================
def test_10_employer_candidate_matching(tokens, db):
    headers = {"Authorization": f"Bearer {tokens['employer']['token']}"}

    # 10a. Fetch job postings
    resp = client.get("/api/employer/job-postings", headers=headers)
    assert resp.status_code == 200, f"Failed to get employer job postings: {resp.text}"
    postings = resp.json()
    assert len(postings) >= 1

    job = next((j for j in postings if j["title"] == "Cooperative Accountant - Chennai Branch"), None)
    assert job is not None, "Seeded job posting 'Cooperative Accountant - Chennai Branch' not found"

    # 10b. Query candidate matches
    matches_resp = client.get(f"/api/employer/job-postings/{job['id']}/matches", headers=headers)
    assert matches_resp.status_code == 200, f"Failed to get matches: {matches_resp.text}"
    matches = matches_resp.json()

    ravi_match = next((m for m in matches if m["name"] == "Ravi Kumar"), None)
    assert ravi_match is not None, f"Ravi Kumar not found in candidate matches: {matches}"
    assert ravi_match["match_percentage"] > 0
    assert "Accounting" in ravi_match["matched_skills"]


# ============================================================================
# 11. Candidate Hiring & Employment Record Creation
# ============================================================================
def test_11_candidate_hiring(tokens, db):
    headers = {"Authorization": f"Bearer {tokens['employer']['token']}"}
    trainee_id = tokens["trainee"]["user"]["id"]

    job = db.query(JobPosting).filter(
        JobPosting.title == "Cooperative Accountant - Chennai Branch"
    ).first()
    assert job is not None

    # Hire candidate
    hire_resp = client.post(
        "/api/employer/employment-records",
        headers=headers,
        json={
            "trainee_id": str(trainee_id),
            "job_posting_id": job.id,
            "status": "ACTIVE"
        }
    )
    assert hire_resp.status_code in [200, 201], f"Failed to hire candidate: {hire_resp.text}"
    rec = hire_resp.json()
    assert rec["trainee_name"] == "Ravi Kumar"
    assert rec["job_title"] == "Cooperative Accountant - Chennai Branch"

    # Verify listing
    list_resp = client.get("/api/employer/employment-records", headers=headers)
    assert list_resp.status_code == 200
    records = list_resp.json()
    assert any(r["id"] == rec["id"] for r in records)


# ============================================================================
# 12. Employer Skill Feedback & Admin Analytics Overview
# ============================================================================
def test_12_employer_feedback_and_admin_analytics(tokens, db):
    # 12a. Employer submits skill feedback (ratings: LOW, MEDIUM, GOOD, HIGH)
    headers = {"Authorization": f"Bearer {tokens['employer']['token']}"}
    user_id = tokens["trainee"]["user"]["id"]
    rec = db.query(EmploymentRecord).filter(
        EmploymentRecord.trainee_id == user_id
    ).order_by(EmploymentRecord.id.desc()).first()
    assert rec is not None, "EmploymentRecord not found"

    acc_skill = db.query(Skill).filter(Skill.name == "Accounting").first()
    assert acc_skill is not None

    fb_resp = client.post(
        "/api/employer/feedback",
        headers=headers,
        json=[{
            "employment_record_id": rec.id,
            "skill_id": acc_skill.id,
            "rating": "HIGH",
            "comments": "Exceptional understanding of cooperative society ledger accounts."
        }]
    )
    assert fb_resp.status_code in [200, 201], f"Failed to submit feedback: {fb_resp.text}"

    # 12b. Admin overview stats
    admin_headers = {"Authorization": f"Bearer {tokens['admin']['token']}"}
    stats_resp = client.get("/api/admin/stats/overview", headers=admin_headers)
    assert stats_resp.status_code == 200, f"Admin stats failed: {stats_resp.text}"
    stats = stats_resp.json()
    assert stats["total_trainees"] >= 1
    assert stats["total_programmes"] >= 1
    assert stats["total_institutes"] >= 1

    # 12c. Admin aggregated skill gaps
    gaps_resp = client.get("/api/admin/stats/skill-gaps", headers=admin_headers)
    assert gaps_resp.status_code == 200, f"Admin skill gaps failed: {gaps_resp.text}"
