import pytest

def test_register_all_four_roles(client):
    """Verify registration for each of the 4 roles: TRAINEE, TRAINER, ADMIN, EMPLOYER."""
    roles = ["TRAINEE", "TRAINER", "ADMIN", "EMPLOYER"]
    for role in roles:
        response = client.post(
            "/api/auth/register",
            json={
                "name": f"Test {role.capitalize()}",
                "email": f"{role.lower()}@ncct.edu",
                "password": "Password123!",
                "role": role
            }
        )
        assert response.status_code == 201, f"Failed for role {role}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == f"{role.lower()}@ncct.edu"
        assert data["user"]["role"] == role

def test_duplicate_registration_fails(client):
    """Verify duplicate email registration yields 400."""
    payload = {
        "name": "First User",
        "email": "unique@ncct.edu",
        "password": "SecretPassword123",
        "role": "TRAINEE"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]

def test_login_success_and_invalid_credentials(client):
    """Test successful login and failure on bad credentials."""
    # Register user
    client.post(
        "/api/auth/register",
        json={
            "name": "Jane Doe",
            "email": "jane@ncct.edu",
            "password": "MyStrongPassword1!",
            "role": "TRAINER"
        }
    )

    # Success login
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "jane@ncct.edu",
            "password": "MyStrongPassword1!"
        }
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "TRAINER"

    # Wrong password
    bad_res = client.post(
        "/api/auth/login",
        json={
            "email": "jane@ncct.edu",
            "password": "WrongPassword"
        }
    )
    assert bad_res.status_code == 401

def test_get_current_user_me(client):
    """Verify /api/auth/me returns the authenticated user."""
    # Register
    reg = client.post(
        "/api/auth/register",
        json={
            "name": "Admin Person",
            "email": "admin@ncct.edu",
            "password": "AdminPassword123",
            "role": "ADMIN"
        }
    )
    token = reg.json()["access_token"]

    # Call /me with token
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "admin@ncct.edu"
    assert me_res.json()["role"] == "ADMIN"

    # Call /me without token
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 401

def test_refresh_token_endpoint(client):
    """Test refreshing an access token using refresh_token."""
    reg = client.post(
        "/api/auth/register",
        json={
            "name": "Employer User",
            "email": "employer@techcorp.com",
            "password": "EmployerPass123",
            "role": "EMPLOYER"
        }
    )
    refresh_tok = reg.json()["refresh_token"]

    ref_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_tok}
    )
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()
    new_access = ref_res.json()["access_token"]

    # Check new access token works on /me
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {new_access}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "employer@techcorp.com"
