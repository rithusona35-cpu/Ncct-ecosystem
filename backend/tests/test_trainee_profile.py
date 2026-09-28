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

def test_profile_creation_auto_generates_id(client):
    token = register_user(client, "Ravi Kumar", "ravi.kumar@ncct.edu", "TRAINEE")

    # Before creating profile, /me should return 404
    res_before = client.get("/api/trainee/profile/me", headers={"Authorization": f"Bearer {token}"})
    assert res_before.status_code == 404

    # Create profile
    payload = {
        "institution": "VAMNICOM Pune",
        "course_enrolled": "Post Graduate Diploma in Cooperative Management",
        "education": "B.Com Honors",
        "preferred_language": "Hindi / English",
        "previous_skills": ["Financial Auditing", "Cooperative Law", "MS Excel"],
        "phone": "+91 9876543210",
        "address": "Ganeshkhind Road, Pune, Maharashtra"
    }
    res_create = client.post(
        "/api/trainee/profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_create.status_code == 200
    data = res_create.json()
    assert "trainee_id" in data
    assert data["trainee_id"].startswith("NCCT-TR-")
    assert data["trainee_id"].endswith("00001")
    assert data["institution"] == "VAMNICOM Pune"
    assert data["course_enrolled"] == "Post Graduate Diploma in Cooperative Management"
    assert data["preferred_language"] == "Hindi / English"
    assert data["previous_skills"] == ["Financial Auditing", "Cooperative Law", "MS Excel"]
    assert data["name"] == "Ravi Kumar"
    assert data["email"] == "ravi.kumar@ncct.edu"

    # Now /me returns the created profile
    res_me = client.get("/api/trainee/profile/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["trainee_id"] == data["trainee_id"]

def test_update_trainee_profile(client):
    token = register_user(client, "Priya Sharma", "priya.sharma@ncct.edu", "TRAINEE")

    # Initial creation
    client.post(
        "/api/trainee/profile",
        json={
            "institution": "RICM Chandigarh",
            "course_enrolled": "Diploma in Cooperative Banking",
            "education": "B.Sc Mathematics",
            "preferred_language": "English",
            "previous_skills": ["Python", "Statistics"]
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    # Update profile
    update_res = client.post(
        "/api/trainee/profile",
        json={
            "institution": "RICM Chandigarh (Main Campus)",
            "course_enrolled": "Advanced Diploma in Cooperative Banking & FinTech",
            "education": "B.Sc Mathematics & Data Science",
            "preferred_language": "English / Punjabi",
            "previous_skills": ["Python", "Statistics", "SQL", "Risk Analysis"]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["institution"] == "RICM Chandigarh (Main Campus)"
    assert updated_data["course_enrolled"] == "Advanced Diploma in Cooperative Banking & FinTech"
    assert "Risk Analysis" in updated_data["previous_skills"]

def test_profile_lookup_by_id_and_access_control(client):
    trainee_a_token = register_user(client, "Student One", "student1@ncct.edu", "TRAINEE")
    trainee_b_token = register_user(client, "Student Two", "student2@ncct.edu", "TRAINEE")
    trainer_token = register_user(client, "Faculty Member", "faculty@ncct.edu", "TRAINER")
    admin_token = register_user(client, "Admin Chief", "chief@ncct.edu", "ADMIN")

    res_a = client.post(
        "/api/trainee/profile",
        json={
            "institution": "NICM Gandhinagar",
            "course_enrolled": "Agribusiness & Cooperative Governance",
            "preferred_language": "Gujarati / English"
        },
        headers={"Authorization": f"Bearer {trainee_a_token}"}
    )
    profile_id = res_a.json()["id"]
    trainee_id = res_a.json()["trainee_id"]

    # Trainee A accesses own profile via integer ID -> 200
    res_self = client.get(f"/api/trainee/profile/{profile_id}", headers={"Authorization": f"Bearer {trainee_a_token}"})
    assert res_self.status_code == 200

    # Trainee A accesses own profile via Trainee ID string -> 200
    res_self_code = client.get(f"/api/trainee/profile/{trainee_id}", headers={"Authorization": f"Bearer {trainee_a_token}"})
    assert res_self_code.status_code == 200

    # Trainee B tries to access Trainee A's profile -> 403 Forbidden
    res_other = client.get(f"/api/trainee/profile/{profile_id}", headers={"Authorization": f"Bearer {trainee_b_token}"})
    assert res_other.status_code == 403

    # Trainer accesses Trainee A's profile -> 200 OK
    res_trainer = client.get(f"/api/trainee/profile/{trainee_id}", headers={"Authorization": f"Bearer {trainer_token}"})
    assert res_trainer.status_code == 200
    assert res_trainer.json()["name"] == "Student One"

    # Admin accesses Trainee A's profile -> 200 OK
    res_admin = client.get(f"/api/trainee/profile/{profile_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200

def test_sequential_trainee_ids(client):
    token1 = register_user(client, "Trainee Alpha", "alpha@ncct.edu", "TRAINEE")
    token2 = register_user(client, "Trainee Beta", "beta@ncct.edu", "TRAINEE")

    res1 = client.post(
        "/api/trainee/profile",
        json={"institution": "Inst 1", "course_enrolled": "Course 1"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    res2 = client.post(
        "/api/trainee/profile",
        json={"institution": "Inst 2", "course_enrolled": "Course 2"},
        headers={"Authorization": f"Bearer {token2}"}
    )

    id1 = res1.json()["trainee_id"]
    id2 = res2.json()["trainee_id"]
    assert id1 != id2
    assert id1.endswith("00001")
    assert id2.endswith("00002")
