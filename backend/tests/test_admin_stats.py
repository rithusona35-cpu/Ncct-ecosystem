import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    User, UserRole, Institution, TrainingProgramme, Module, ContentItem,
    Batch, TraineeProfile, Progress, Attendance, Skill, JobRole,
    JobRoleSkillRequirement, JobPosting, EmploymentRecord, EmployerFeedback,
    FeedbackRating
)
from app.security import hash_password
from app.services.admin_stats_service import (
    get_overview_stats,
    get_low_completion_courses,
    get_combined_skill_gaps,
    get_high_demand_skills,
)



def get_auth_token(client: TestClient, email: str, role: str = "ADMIN", name: str = "Admin User"):
    client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role
    })
    login_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_resp.status_code == 200, f"Login failed for {email}: {login_resp.text}"
    return login_resp.json()["access_token"], login_resp.json()["user"]["id"]


@pytest.fixture
def seed_admin_stats_data(client, db_session: Session):
    """
    Seeds a controlled environment:
    - 2 Institutions
    - 2 Training Programmes:
      - Course A ("Advanced Cooperative Banking"): 2 modules, 2 content items.
        - Trainee 1 completed 2/2 -> 100.0% completion.
        - Trainee 2 completed 1/2 -> 50.0% completion.
        - Course A average completion: (100.0 + 50.0) / 2 = 75.0% (>= 50%).
      - Course B ("PACS Rural Credit Management"): 2 modules, 2 content items.
        - Trainee 3 completed 0/2 -> 0.0% completion.
        - Course B average completion: 0.0% (< 50%).
    - Trainees:
      - 3 TraineeProfiles.
      - Trainee 1: 100.0% completion, attendance 2/2 sessions = 100.0%
      - Trainee 2: 50.0% completion, attendance 1/2 sessions = 50.0%
      - Trainee 3: 0.0% completion, attendance 0/2 sessions = 0.0%
      - Overall completion rate: (100.0 + 50.0 + 0.0) / 3 = 50.0%
      - Average attendance: (100.0 + 50.0 + 0.0) / 3 = 50.0%
    """
    # 1. Admin & Users
    admin_token, admin_id = get_auth_token(client, "admin.stats@ncct.gov.in", role="ADMIN", name="Stats Admin")
    trainer_token, trainer_id = get_auth_token(client, "trainer.stats@ncct.edu", role="TRAINER", name="Dr. Trainer")
    trainee_token, t1_uid = get_auth_token(client, "trainee1.stats@ncct.edu", role="TRAINEE", name="Trainee One")
    _, t2_uid = get_auth_token(client, "trainee2.stats@ncct.edu", role="TRAINEE", name="Trainee Two")
    _, t3_uid = get_auth_token(client, "trainee3.stats@ncct.edu", role="TRAINEE", name="Trainee Three")
    employer_token, _ = get_auth_token(client, "employer.stats@coop.org", role="EMPLOYER", name="Employer Org")

    # 2. Institutions
    inst1 = Institution(name="VAMNICOM Pune", code="VAMNICOM", location="Pune")
    inst2 = Institution(name="RICM Bengaluru", code="RICM-BLR", location="Bengaluru")
    db_session.add_all([inst1, inst2])
    db_session.commit()
    db_session.refresh(inst1)
    db_session.refresh(inst2)

    # 3. Training Programmes
    prog_a = TrainingProgramme(
        title="Advanced Cooperative Banking",
        description="Comprehensive banking programme",
        institution_id=inst1.id,
        trainer_id=trainer_id
    )
    prog_b = TrainingProgramme(
        title="PACS Rural Credit Management",
        description="Rural credit foundations",
        institution_id=inst2.id,
        trainer_id=trainer_id
    )
    db_session.add_all([prog_a, prog_b])
    db_session.commit()
    db_session.refresh(prog_a)
    db_session.refresh(prog_b)

    # 4. Modules & Content Items
    m_a1 = Module(programme_id=prog_a.id, title="Module A1", order=1)
    m_a2 = Module(programme_id=prog_a.id, title="Module A2", order=2)
    m_b1 = Module(programme_id=prog_b.id, title="Module B1", order=1)
    m_b2 = Module(programme_id=prog_b.id, title="Module B2", order=2)
    db_session.add_all([m_a1, m_a2, m_b1, m_b2])
    db_session.commit()
    for m in [m_a1, m_a2, m_b1, m_b2]:
        db_session.refresh(m)

    ci_a1 = ContentItem(module_id=m_a1.id, type="video", title="A1 Video", url_or_file_path="https://example.com/a1.mp4", order=1)
    ci_a2 = ContentItem(module_id=m_a2.id, type="document", title="A2 Doc", url_or_file_path="https://example.com/a2.pdf", order=1)
    ci_b1 = ContentItem(module_id=m_b1.id, type="video", title="B1 Video", url_or_file_path="https://example.com/b1.mp4", order=1)
    ci_b2 = ContentItem(module_id=m_b2.id, type="document", title="B2 Doc", url_or_file_path="https://example.com/b2.pdf", order=1)
    db_session.add_all([ci_a1, ci_a2, ci_b1, ci_b2])
    db_session.commit()
    for ci in [ci_a1, ci_a2, ci_b1, ci_b2]:
        db_session.refresh(ci)

    # 5. Trainee Profiles & Batches
    tp1 = TraineeProfile(user_id=t1_uid, trainee_id="NCCT-STAT-001", institution="VAMNICOM Pune")
    tp2 = TraineeProfile(user_id=t2_uid, trainee_id="NCCT-STAT-002", institution="VAMNICOM Pune")
    tp3 = TraineeProfile(user_id=t3_uid, trainee_id="NCCT-STAT-003", institution="RICM Bengaluru")
    db_session.add_all([tp1, tp2, tp3])
    db_session.commit()
    for tp in [tp1, tp2, tp3]:
        db_session.refresh(tp)

    batch_a = Batch(programme_id=prog_a.id, batch_name="Batch Banking 2026")
    batch_a.trainees.extend([tp1, tp2])
    batch_b = Batch(programme_id=prog_b.id, batch_name="Batch PACS 2026")
    batch_b.trainees.append(tp3)
    db_session.add_all([batch_a, batch_b])
    db_session.commit()

    # 6. Progress Records
    # Trainee 1 completed both items in Prog A (2/2 = 100%)
    p1_1 = Progress(trainee_id=t1_uid, module_id=m_a1.id, content_item_id=ci_a1.id, status="completed")
    p1_2 = Progress(trainee_id=t1_uid, module_id=m_a2.id, content_item_id=ci_a2.id, status="completed")

    # Trainee 2 completed 1 item in Prog A (1/2 = 50%)
    p2_1 = Progress(trainee_id=t2_uid, module_id=m_a1.id, content_item_id=ci_a1.id, status="completed")
    p2_2 = Progress(trainee_id=t2_uid, module_id=m_a2.id, content_item_id=ci_a2.id, status="in_progress")

    # Trainee 3 completed 0 items in Prog B (0/2 = 0%)
    p3_1 = Progress(trainee_id=t3_uid, module_id=m_b1.id, content_item_id=ci_b1.id, status="not_started")
    p3_2 = Progress(trainee_id=t3_uid, module_id=m_b2.id, content_item_id=ci_b2.id, status="not_started")

    db_session.add_all([p1_1, p1_2, p2_1, p2_2, p3_1, p3_2])
    db_session.commit()

    # 7. Attendance Records
    # 2 Sessions: SESS-01 and SESS-02
    # Trainee 1 attended both SESS-01 & SESS-02 (2/2 = 100%)
    att1_1 = Attendance(trainee_id=t1_uid, programme_id=prog_a.id, session_id="SESS-01", date="2026-09-20", status="PRESENT")
    att1_2 = Attendance(trainee_id=t1_uid, programme_id=prog_a.id, session_id="SESS-02", date="2026-09-21", status="PRESENT")

    # Trainee 2 attended SESS-01 only (1/2 = 50%)
    att2_1 = Attendance(trainee_id=t2_uid, programme_id=prog_a.id, session_id="SESS-01", date="2026-09-20", status="PRESENT")

    # Trainee 3 attended 0 sessions (0/2 = 0%)
    db_session.add_all([att1_1, att1_2, att2_1])
    db_session.commit()

    return {
        "admin_token": admin_token,
        "trainee_token": trainee_token,
        "employer_token": employer_token,
        "prog_a_id": prog_a.id,
        "prog_b_id": prog_b.id,
        "prog_a_title": prog_a.title,
        "prog_b_title": prog_b.title,
    }


def test_admin_overview_stats_service_calculation(seed_admin_stats_data, db_session: Session):
    """
    Verify service calculation logic for overview stats directly.
    """
    stats = get_overview_stats(db=db_session)
    assert stats["total_trainees"] == 3
    assert stats["total_programmes"] == 2
    assert stats["total_institutes"] == 2
    # overall_completion_rate: (100.0 + 50.0 + 0.0) / 3 = 50.0%
    assert stats["overall_completion_rate"] == 50.0
    # average_attendance: (100.0 + 50.0 + 0.0) / 3 = 50.0%
    assert stats["average_attendance"] == 50.0


def test_admin_low_completion_courses_service_calculation(seed_admin_stats_data, db_session: Session):
    """
    Verify service calculation logic for low-completion courses (< 50%).
    Course A = 75.0% (omitted). Course B = 0.0% (included).
    """
    low_courses = get_low_completion_courses(threshold=50.0, db=db_session)
    assert len(low_courses) == 1
    assert low_courses[0]["course_id"] == seed_admin_stats_data["prog_b_id"]
    assert low_courses[0]["course_title"] == "PACS Rural Credit Management"
    assert low_courses[0]["completion_percentage"] == 0.0


def test_get_admin_overview_stats_endpoint(client: TestClient, seed_admin_stats_data):
    """
    Test GET /api/admin/stats/overview endpoint with ADMIN token.
    """
    token = seed_admin_stats_data["admin_token"]
    response = client.get(
        "/api/admin/stats/overview",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    assert data["total_trainees"] == 3
    assert data["total_programmes"] == 2
    assert data["total_institutes"] == 2
    assert data["overall_completion_rate"] == 50.0
    assert data["average_attendance"] == 50.0


def test_get_admin_low_completion_courses_endpoint(client: TestClient, seed_admin_stats_data):
    """
    Test GET /api/admin/stats/low-completion-courses endpoint with ADMIN token.
    """
    token = seed_admin_stats_data["admin_token"]
    response = client.get(
        "/api/admin/stats/low-completion-courses",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 1
    item = data[0]
    assert item["course_title"] == "PACS Rural Credit Management"
    assert item["completion_percentage"] == 0.0


def test_admin_stats_role_authorization(client: TestClient, seed_admin_stats_data):
    """
    Test RBAC authorization: Non-admin users (TRAINEE, EMPLOYER) must get 403 Forbidden.
    Unauthenticated requests must get 401 Unauthorized.
    """
    # 1. Trainee token -> 403
    t_token = seed_admin_stats_data["trainee_token"]
    r_trainee = client.get("/api/admin/stats/overview", headers={"Authorization": f"Bearer {t_token}"})
    assert r_trainee.status_code == 403

    r_trainee_low = client.get("/api/admin/stats/low-completion-courses", headers={"Authorization": f"Bearer {t_token}"})
    assert r_trainee_low.status_code == 403

    # 2. Employer token -> 403
    emp_token = seed_admin_stats_data["employer_token"]
    r_emp = client.get("/api/admin/stats/overview", headers={"Authorization": f"Bearer {emp_token}"})
    assert r_emp.status_code == 403

    r_emp_low = client.get("/api/admin/stats/low-completion-courses", headers={"Authorization": f"Bearer {emp_token}"})
    assert r_emp_low.status_code == 403

    # 3. Unauthenticated -> 401
    r_noauth = client.get("/api/admin/stats/overview")
    assert r_noauth.status_code == 401

    r_noauth_low = client.get("/api/admin/stats/low-completion-courses")
    assert r_noauth_low.status_code == 401


@pytest.fixture
def seed_skill_analytics_data(client, db_session: Session):
    admin_token, admin_id = get_auth_token(client, "admin.skillana@ncct.gov.in", role="ADMIN", name="Analytics Admin")
    trainee_token, t_uid = get_auth_token(client, "trainee.skillana@ncct.edu", role="TRAINEE", name="Trainee Skill Ana")
    employer_token, emp_uid = get_auth_token(client, "employer.skillana@coop.org", role="EMPLOYER", name="Employer Skill Ana")

    # Skills
    s_erp = Skill(name="ERP Practical", category="Technical")
    s_comm = Skill(name="Communication", category="Soft Skills")
    s_acc = Skill(name="Accounting", category="Finance")
    db_session.add_all([s_erp, s_comm, s_acc])
    db_session.commit()
    for s in [s_erp, s_comm, s_acc]:
        db_session.refresh(s)

    # Job Roles
    role1 = JobRole(title="Cooperative Accountant", description="Accounting operations")
    role2 = JobRole(title="PACS Supervisor", description="Supervisory operations")
    db_session.add_all([role1, role2])
    db_session.commit()
    db_session.refresh(role1)
    db_session.refresh(role2)

    # Role Requirements:
    # Role 1 requires ERP Practical (MEDIUM -> 60%) and Accounting (HIGH -> 70%)
    # Role 2 requires ERP Practical (HIGH -> 70%) and Communication (MEDIUM -> 60%)
    req1 = JobRoleSkillRequirement(job_role_id=role1.id, skill_id=s_erp.id, required_level="MEDIUM")
    req2 = JobRoleSkillRequirement(job_role_id=role1.id, skill_id=s_acc.id, required_level="HIGH")
    req3 = JobRoleSkillRequirement(job_role_id=role2.id, skill_id=s_erp.id, required_level="HIGH")
    req4 = JobRoleSkillRequirement(job_role_id=role2.id, skill_id=s_comm.id, required_level="MEDIUM")
    db_session.add_all([req1, req2, req3, req4])
    db_session.commit()

    # Trainee Profile
    tp = TraineeProfile(user_id=t_uid, trainee_id="NCCT-SKILLANA-001")
    db_session.add(tp)
    db_session.commit()

    # Active Job Postings:
    # 2 postings for Role 1 (requires ERP Practical, Accounting)
    # 1 posting for Role 2 (requires ERP Practical, Communication)
    # 1 INACTIVE posting for Role 1 (should not be counted in high demand)
    jp1 = JobPosting(employer_id=emp_uid, job_role_id=role1.id, title="Job 1", is_active=True, location="Pune")
    jp2 = JobPosting(employer_id=emp_uid, job_role_id=role1.id, title="Job 2", is_active=True, location="Mumbai")
    jp3 = JobPosting(employer_id=emp_uid, job_role_id=role2.id, title="Job 3", is_active=True, location="Delhi")
    jp4 = JobPosting(employer_id=emp_uid, job_role_id=role1.id, title="Job 4 (Inactive)", is_active=False, location="Pune")
    db_session.add_all([jp1, jp2, jp3, jp4])
    db_session.commit()

    # Employment Record & Feedback:
    # 5 feedback records for ERP Practical: 4 LOW, 1 GOOD (80% LOW)
    # 5 feedback records for Communication: 5 GOOD (0% LOW)
    rec = EmploymentRecord(trainee_id=t_uid, employer_id=emp_uid, job_posting_id=jp1.id, status="ACTIVE")
    db_session.add(rec)
    db_session.commit()
    db_session.refresh(rec)

    for i in range(5):
        rating_erp = FeedbackRating.LOW if i < 4 else FeedbackRating.GOOD
        fb_erp = EmployerFeedback(employment_record_id=rec.id, skill_id=s_erp.id, rating=rating_erp, submitted_at=datetime.utcnow())
        fb_comm = EmployerFeedback(employment_record_id=rec.id, skill_id=s_comm.id, rating=FeedbackRating.GOOD, submitted_at=datetime.utcnow())
        db_session.add_all([fb_erp, fb_comm])
    db_session.commit()

    return {
        "admin_token": admin_token,
        "trainee_token": trainee_token,
        "employer_token": employer_token,
        "erp_id": s_erp.id,
        "acc_id": s_acc.id,
        "comm_id": s_comm.id
    }


def test_admin_combined_skill_gaps(client: TestClient, seed_skill_analytics_data, db_session: Session):
    """
    Assert get_combined_skill_gaps ranks 'Practical ERP' at top with source='both',
    since it received 4/5 LOW feedback from employers AND appears as a training gap.
    """
    gaps = get_combined_skill_gaps(db=db_session)
    assert len(gaps) >= 1

    top_gap = gaps[0]
    assert "erp" in top_gap["skill_name"].lower()
    assert top_gap["source"] == "both"
    # Severity score = 0.5 * 80 (fb) + 0.5 * 100 (training) = 90.0
    assert top_gap["severity_score"] == 90.0

    # Call endpoint via TestClient
    token = seed_skill_analytics_data["admin_token"]
    resp = client.get("/api/admin/stats/skill-gaps", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "erp" in data[0]["skill_name"].lower()
    assert data[0]["source"] == "both"
    assert data[0]["severity_score"] == 90.0


def test_admin_high_demand_skills(client: TestClient, seed_skill_analytics_data, db_session: Session):
    """
    Assert get_high_demand_skills correctly counts active JobPostings:
    - ERP Practical is required by jp1, jp2, jp3 -> count 3
    - Accounting is required by jp1, jp2 -> count 2
    - Communication is required by jp3 -> count 1
    - jp4 (inactive) is omitted.
    """
    skills = get_high_demand_skills(db=db_session)
    assert len(skills) == 3

    # Ranked descending by demand_count
    assert skills[0]["skill_name"] == "ERP Practical"
    assert skills[0]["demand_count"] == 3

    assert skills[1]["skill_name"] == "Accounting"
    assert skills[1]["demand_count"] == 2

    assert skills[2]["skill_name"] == "Communication"
    assert skills[2]["demand_count"] == 1

    # Call endpoint via TestClient
    token = seed_skill_analytics_data["admin_token"]
    resp = client.get("/api/admin/stats/high-demand-skills", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert data[0]["skill_name"] == "ERP Practical"
    assert data[0]["demand_count"] == 3


def test_admin_stats_skill_gaps_role_authorization(client: TestClient, seed_skill_analytics_data):
    """
    Test RBAC authorization for skill-gaps and high-demand-skills:
    Non-admin users (TRAINEE, EMPLOYER) must get 403 Forbidden.
    Unauthenticated requests must get 401 Unauthorized.
    """
    # 1. Trainee token -> 403
    t_token = seed_skill_analytics_data["trainee_token"]
    r1 = client.get("/api/admin/stats/skill-gaps", headers={"Authorization": f"Bearer {t_token}"})
    assert r1.status_code == 403
    r2 = client.get("/api/admin/stats/high-demand-skills", headers={"Authorization": f"Bearer {t_token}"})
    assert r2.status_code == 403

    # 2. Employer token -> 403
    emp_token = seed_skill_analytics_data["employer_token"]
    r3 = client.get("/api/admin/stats/skill-gaps", headers={"Authorization": f"Bearer {emp_token}"})
    assert r3.status_code == 403
    r4 = client.get("/api/admin/stats/high-demand-skills", headers={"Authorization": f"Bearer {emp_token}"})
    assert r4.status_code == 403

    # 3. Unauthenticated -> 401
    assert client.get("/api/admin/stats/skill-gaps").status_code == 401
    assert client.get("/api/admin/stats/high-demand-skills").status_code == 401

