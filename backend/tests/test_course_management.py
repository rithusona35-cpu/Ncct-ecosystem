import pytest

def register_user(client, name: str, email: str, role: str) -> str:
    res = client.post(
        "/api/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "Password123!",
            "role": role
        }
    )
    assert res.status_code == 201
    return res.json()["access_token"]

def test_full_course_lifecycle_and_enrollment(client):
    """
    Definition of Done Verification:
    Trainer creates programme 'Cooperative Accounting and Digital ERP',
    adds 2 modules with content, creates a batch, adds a trainee to it,
    and that trainee sees the course appear under /api/courses/my-courses with content.
    """
    # 1. Register Trainer and Trainee
    trainer_token = register_user(client, "Prof. Sharma", "prof.sharma@ncct.edu", "TRAINER")
    trainee_token = register_user(client, "Amit Patel", "amit.patel@ncct.edu", "TRAINEE")

    # Trainee sets up profile to get auto-generated Trainee ID
    prof_res = client.post(
        "/api/trainee/profile",
        json={
            "institution": "VAMNICOM Pune",
            "course_enrolled": "Cooperative Management",
            "education": "B.Com",
            "preferred_language": "English",
            "previous_skills": ["Accounting", "Excel"]
        },
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert prof_res.status_code == 200
    trainee_id_str = prof_res.json()["trainee_id"]

    # 2. Get Institutions
    inst_res = client.get("/api/institutions")
    assert inst_res.status_code == 200
    institutions = inst_res.json()
    assert len(institutions) > 0
    inst_id = institutions[0]["id"]

    # 3. Trainer creates Training Programme: "Cooperative Accounting and Digital ERP"
    prog_payload = {
        "title": "Cooperative Accounting and Digital ERP",
        "description": "Comprehensive accounting standards, ledger auditing, and enterprise ERP training.",
        "institution_id": inst_id,
        "start_date": "2026-10-01",
        "end_date": "2026-12-15"
    }
    prog_res = client.post(
        "/api/trainer/programmes",
        json=prog_payload,
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert prog_res.status_code == 201
    programme_data = prog_res.json()
    prog_id = programme_data["id"]
    assert programme_data["title"] == "Cooperative Accounting and Digital ERP"

    # 4. Trainer adds 2 Modules
    # Module 1
    m1_res = client.post(
        f"/api/trainer/programmes/{prog_id}/modules",
        json={"title": "Module 1: Principles of Cooperative Accounting", "order": 1},
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert m1_res.status_code == 201
    m1_id = m1_res.json()["id"]

    # Module 2
    m2_res = client.post(
        f"/api/trainer/programmes/{prog_id}/modules",
        json={"title": "Module 2: ERP Systems & Compliance Audits", "order": 2},
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert m2_res.status_code == 201
    m2_id = m2_res.json()["id"]

    # 5. Trainer uploads/adds content items
    # Module 1 Video
    c1_res = client.post(
        f"/api/trainer/modules/{m1_id}/content",
        json={
            "type": "video",
            "title": "Introduction to Cooperative Ledgers",
            "url_or_file_path": "https://www.youtube.com/watch?v=demo-accounting-coop",
            "order": 1
        },
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert c1_res.status_code == 201

    # Module 1 PDF Document
    c2_res = client.post(
        f"/api/trainer/modules/{m1_id}/content",
        json={
            "type": "pdf",
            "title": "Accounting Manual & Chart of Accounts.pdf",
            "url_or_file_path": "/uploads/accounting_manual_2026.pdf",
            "order": 2
        },
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert c2_res.status_code == 201

    # Module 2 Note
    c3_res = client.post(
        f"/api/trainer/modules/{m2_id}/content",
        json={
            "type": "note",
            "title": "ERP Setup & Key Formulas",
            "url_or_file_path": "https://docs.ncct.edu/erp-cheatsheet",
            "order": 1
        },
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert c3_res.status_code == 201

    # 6. Trainer creates a Batch
    batch_res = client.post(
        f"/api/trainer/programmes/{prog_id}/batches",
        json={"batch_name": "Autumn 2026 Batch A"},
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert batch_res.status_code == 201
    batch_id = batch_res.json()["id"]

    # 7. Trainer adds Trainee to Batch via Trainee ID
    add_res = client.post(
        f"/api/trainer/batches/{batch_id}/trainees",
        json={"trainee_ids": [trainee_id_str]},
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert add_res.status_code == 200
    roster = add_res.json()
    assert len(roster) == 1
    assert roster[0]["trainee_id"] == trainee_id_str
    assert roster[0]["name"] == "Amit Patel"

    # 8. Trainee calls /api/courses/my-courses -> Sees enrolled programme with all 2 modules and content!
    my_courses_res = client.get(
        "/api/courses/my-courses",
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert my_courses_res.status_code == 200
    enrolled = my_courses_res.json()
    assert len(enrolled) == 1
    course = enrolled[0]
    assert course["title"] == "Cooperative Accounting and Digital ERP"
    assert course["batch_name"] == "Autumn 2026 Batch A"
    assert len(course["modules"]) == 2
    assert course["modules"][0]["title"] == "Module 1: Principles of Cooperative Accounting"
    assert len(course["modules"][0]["content_items"]) == 2
    assert course["modules"][0]["content_items"][0]["type"] == "video"
    assert course["modules"][0]["content_items"][1]["type"] == "pdf"
    assert course["modules"][1]["content_items"][0]["type"] == "note"

def test_trainee_cannot_create_programme_or_batch(client):
    """Verify role security prevents trainees from creating programmes or batches."""
    trainee_token = register_user(client, "Regular Trainee", "reg.trainee@ncct.edu", "TRAINEE")

    # Attempt create programme
    prog_res = client.post(
        "/api/trainer/programmes",
        json={"title": "Hacked Course", "institution_id": 1},
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert prog_res.status_code == 403

    # Attempt create batch
    batch_res = client.post(
        "/api/trainer/programmes/1/batches",
        json={"batch_name": "Unauthorized Batch"},
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert batch_res.status_code == 403
