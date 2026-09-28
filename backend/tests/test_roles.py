import pytest

def register_user(client, name: str, email: str, role: str) -> str:
    res = client.post(
        "/api/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "SecurePassword123!",
            "role": role
        }
    )
    assert res.status_code == 201
    return res.json()["access_token"]

def test_admin_route_protection(client):
    admin_token = register_user(client, "Admin User", "admin@ncct.gov", "ADMIN")
    trainee_token = register_user(client, "Trainee User", "trainee@ncct.gov", "TRAINEE")
    employer_token = register_user(client, "Employer User", "employer@ncct.gov", "EMPLOYER")

    # Admin should get 200 OK
    res_admin = client.get(
        "/api/protected/admin",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200
    assert "Administrator" in res_admin.json()["message"]

    # Trainee should get 403 Forbidden
    res_trainee = client.get(
        "/api/protected/admin",
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert res_trainee.status_code == 403
    assert "Access forbidden" in res_trainee.json()["detail"]

    # Employer should get 403 Forbidden
    res_employer = client.get(
        "/api/protected/admin",
        headers={"Authorization": f"Bearer {employer_token}"}
    )
    assert res_employer.status_code == 403

def test_trainer_route_protection(client):
    trainer_token = register_user(client, "Trainer User", "trainer@ncct.gov", "TRAINER")
    trainee_token = register_user(client, "Trainee User 2", "trainee2@ncct.gov", "TRAINEE")
    employer_token = register_user(client, "Employer User 2", "employer2@ncct.gov", "EMPLOYER")

    # Trainer should get 200
    res_trainer = client.get(
        "/api/protected/trainer",
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    assert res_trainer.status_code == 200

    # Trainee should get 403
    res_trainee = client.get(
        "/api/protected/trainer",
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert res_trainee.status_code == 403

    # Employer should get 403
    res_employer = client.get(
        "/api/protected/trainer",
        headers={"Authorization": f"Bearer {employer_token}"}
    )
    assert res_employer.status_code == 403

def test_trainee_and_employer_routes(client):
    trainee_token = register_user(client, "Trainee User 3", "trainee3@ncct.gov", "TRAINEE")
    employer_token = register_user(client, "Employer User 3", "employer3@ncct.gov", "EMPLOYER")

    # Trainee accessing trainee route -> 200
    res_trainee = client.get(
        "/api/protected/trainee",
        headers={"Authorization": f"Bearer {trainee_token}"}
    )
    assert res_trainee.status_code == 200

    # Employer accessing employer route -> 200
    res_employer = client.get(
        "/api/protected/employer",
        headers={"Authorization": f"Bearer {employer_token}"}
    )
    assert res_employer.status_code == 200

    # Employer accessing trainee route -> 403
    res_emp_trainee = client.get(
        "/api/protected/trainee",
        headers={"Authorization": f"Bearer {employer_token}"}
    )
    assert res_emp_trainee.status_code == 403

def test_unauthenticated_requests_return_401(client):
    """Requests with missing or invalid token must return 401."""
    # No auth header
    res_no_auth = client.get("/api/protected/admin")
    assert res_no_auth.status_code == 401

    # Malformed token
    res_bad_auth = client.get(
        "/api/protected/admin",
        headers={"Authorization": "Bearer invalid.token.payload"}
    )
    assert res_bad_auth.status_code == 401
