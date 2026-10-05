import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.models import User, UserRole, JobRole, Skill, JobPosting, EmploymentRecord, EmployerFeedback, FeedbackRating, TraineeProfile
from app.services.feedback_analytics import get_common_skill_gaps


def get_auth_token(client: TestClient, email: str, role: str = "ADMIN", name: str = "Test User"):
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


def get_or_create_skill(db, name: str, category: str = "Technical") -> Skill:
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        skill = Skill(name=name, category=category)
        db.add(skill)
        db.commit()
        db.refresh(skill)
    return skill


@pytest.fixture
def seed_feedback_analytics_data(client, db_session):
    """
    Seed feedback data where:
    - 'ERP Practical' gets LOW from 4 out of 5 employers (4 LOW, 1 GOOD) -> 80% LOW
    - 'Communication' gets GOOD from all 5 employers (0 LOW, 5 GOOD) -> 0% LOW
    """
    # 1. Admin user
    admin_token, admin_id = get_auth_token(client, email="admin.analytics@ncct.gov.in", role="ADMIN", name="NCCT Super Admin")

    # 2. Trainee
    trainee_token, trainee_id = get_auth_token(client, email="trainee.analytics@ncct.edu", role="TRAINEE", name="Suresh Patel")

    # 3. Job Role
    role = db_session.query(JobRole).first()
    if not role:
        role = JobRole(title="Cooperative Officer", description="Society operations")
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

    # 4. Target Skills
    erp_skill = get_or_create_skill(db_session, "ERP Practical", "Technical")
    comm_skill = get_or_create_skill(db_session, "Communication", "Soft Skills")

    # 5. Create 5 Employers, 5 Job Postings, 5 Employment Records, and Feedback
    # ERP ratings: 4 LOW, 1 GOOD
    erp_ratings = [FeedbackRating.LOW, FeedbackRating.LOW, FeedbackRating.LOW, FeedbackRating.LOW, FeedbackRating.GOOD]
    # Communication ratings: 5 GOOD
    comm_ratings = [FeedbackRating.GOOD, FeedbackRating.GOOD, FeedbackRating.GOOD, FeedbackRating.GOOD, FeedbackRating.GOOD]

    for i in range(5):
        emp_token, emp_id = get_auth_token(client, email=f"employer.spec.{i+1}@coop.in", role="EMPLOYER", name=f"Cooperative Enterprise {i+1}")
        
        job = JobPosting(
            employer_id=emp_id,
            job_role_id=role.id,
            title=f"Accounts Executive #{i+1}",
            description="Operational role",
            location="Gujarat",
            is_active=True
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        rec = EmploymentRecord(
            trainee_id=trainee_id,
            employer_id=emp_id,
            job_posting_id=job.id,
            hired_date=datetime.utcnow(),
            status="ACTIVE"
        )
        db_session.add(rec)
        db_session.commit()
        db_session.refresh(rec)

        # Submit ERP Practical feedback
        fb_erp = EmployerFeedback(
            employment_record_id=rec.id,
            skill_id=erp_skill.id,
            rating=erp_ratings[i],
            comments=f"ERP evaluation from Employer {i+1}",
            submitted_at=datetime.utcnow()
        )
        db_session.add(fb_erp)

        # Submit Communication feedback
        fb_comm = EmployerFeedback(
            employment_record_id=rec.id,
            skill_id=comm_skill.id,
            rating=comm_ratings[i],
            comments=f"Communication evaluation from Employer {i+1}",
            submitted_at=datetime.utcnow()
        )
        db_session.add(fb_comm)

    db_session.commit()

    return {
        "admin_token": admin_token,
        "admin_id": admin_id,
        "erp_skill_id": erp_skill.id,
        "comm_skill_id": comm_skill.id
    }


def test_get_common_skill_gaps_service_logic(seed_feedback_analytics_data, db_session):
    """
    Assert get_common_skill_gaps flags 'ERP Practical' (4/5 = 80% LOW) and does NOT flag 'Communication' (0/5 = 0% LOW).
    """
    gaps = get_common_skill_gaps(min_reports=3, low_threshold_ratio=0.5, db=db_session)
    assert len(gaps) >= 2, "Expected at least 2 skills in aggregated gaps"

    # Find ERP Practical and Communication
    erp_result = next((g for g in gaps if g["skill_name"] == "ERP Practical"), None)
    comm_result = next((g for g in gaps if g["skill_name"] == "Communication"), None)

    assert erp_result is not None, "ERP Practical should be present in results"
    assert comm_result is not None, "Communication should be present in results"

    # Verify ERP Practical stats
    assert erp_result["total_reports"] == 5
    assert erp_result["low_rating_ratio"] == 0.8
    assert erp_result["flagged"] is True, "ERP Practical MUST be flagged since 80% >= 50%"

    # Verify Communication stats
    assert comm_result["total_reports"] == 5
    assert comm_result["low_rating_ratio"] == 0.0
    assert comm_result["flagged"] is False, "Communication MUST NOT be flagged since 0% < 50%"

    # Verify sorting: ERP Practical (0.8) must be ranked above Communication (0.0)
    erp_index = gaps.index(erp_result)
    comm_index = gaps.index(comm_result)
    assert erp_index < comm_index, "ERP Practical with higher low ratio should be ranked before Communication"


def test_get_common_skill_gaps_endpoint_admin(client, seed_feedback_analytics_data):
    """
    Test GET /api/admin/feedback/skill-gaps with ADMIN role.
    """
    f = seed_feedback_analytics_data

    resp = client.get(
        "/api/admin/feedback/skill-gaps",
        headers={"Authorization": f"Bearer {f['admin_token']}"}
    )
    assert resp.status_code == 200, f"Endpoint failed: {resp.text}"
    data = resp.json()
    assert isinstance(data, list)

    erp_item = next((item for item in data if item["skill_name"] == "ERP Practical"), None)
    comm_item = next((item for item in data if item["skill_name"] == "Communication"), None)

    assert erp_item is not None
    assert erp_item["flagged"] is True
    assert erp_item["low_rating_ratio"] == 0.8
    assert erp_item["total_reports"] == 5

    assert comm_item is not None
    assert comm_item["flagged"] is False
    assert comm_item["low_rating_ratio"] == 0.0
    assert comm_item["total_reports"] == 5


def test_get_common_skill_gaps_endpoint_non_admin_forbidden(client, seed_feedback_analytics_data):
    """
    Non-admin user (e.g. TRAINEE or EMPLOYER) must receive 403 Forbidden.
    """
    # Create trainee
    trainee_token, _ = get_auth_token(client, email="regular.trainee@ncct.edu", role="TRAINEE", name="Regular Trainee")

    resp = client.get(
        "/api/admin/feedback/skill-gaps",
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert resp.status_code == 403
    assert "role" in resp.json()["detail"].lower()
