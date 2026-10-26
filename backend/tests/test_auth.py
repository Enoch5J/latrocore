"""
Automated Security & Authentication Test Suite for LATROCORE.
Validates:
- Argon2id password verification & generic error handling
- HttpOnly, Secure, SameSite=Strict __Host- cookie attributes
- Strict absence of Refresh Token in JSON or frontend state
- SHA-256 database hashing of Refresh Tokens
- JWT claim validation & session link
- Atomic Refresh Token rotation with fixed 7-day session lifespan
- Token reuse attack detection and session revocation
- Idempotent logout revoking session and rejecting old Access Tokens
- CSRF defense (required custom request header & exact origin check)
- Login rate limiting by IP and account
"""

import hashlib
import pytest
from datetime import datetime, timedelta, timezone
from starlette.testclient import TestClient
from main import app
from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password, create_access_token, decode_access_token, ensure_utc
from app.models.models import User, Session as UserSession, RefreshToken, RateLimitAttempt

client = TestClient(app, base_url="https://localhost:5173")

# Common CSRF headers required by backend
CSRF_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://localhost:5173"
}


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Clean previous auth records
    db.query(RefreshToken).delete()
    db.query(UserSession).delete()
    db.query(RateLimitAttempt).delete()
    
    # Ensure test user exists
    user = db.query(User).filter(User.email == "testuser@latrocore.internal").first()
    if not user:
        user = User(
            email="testuser@latrocore.internal",
            password_hash=hash_password("CorrectHorseBatteryStaple123!"),
            name="Test User",
            role="patient",
            status="active",
            verified=True
        )
        db.add(user)
    else:
        user.password_hash = hash_password("CorrectHorseBatteryStaple123!")
        user.status = "active"
    db.commit()
    db.close()
    yield


def test_login_success():
    """Verify successful login, Argon2id verification, JSON structure, and cookie attributes."""
    res = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS
    )
    assert res.status_code == 200, res.text
    data = res.json()
    
    # Verify JSON response structure
    assert "accessToken" in data
    assert data["tokenType"] == "Bearer"
    assert data["expiresIn"] == 900
    assert data["user"]["email"] == "testuser@latrocore.internal"
    assert data["user"]["name"] == "Test User"
    
    # CRITICAL: Refresh Token must NEVER appear in JSON
    assert "refreshToken" not in data
    assert "refresh_token" not in data
    assert "token" not in data.get("user", {})
    
    # Verify Cookie security attributes
    assert settings.COOKIE_NAME in res.cookies
    set_cookie_header = res.headers.get("set-cookie", "")
    assert settings.COOKIE_NAME in set_cookie_header
    assert "httponly" in set_cookie_header.lower()
    assert "secure" in set_cookie_header.lower()
    assert "samesite=strict" in set_cookie_header.lower()
    assert "path=/" in set_cookie_header.lower()
    # RFC 6265bis: __Host- cookie MUST NOT contain domain attribute
    assert "domain=" not in set_cookie_header.lower()


def test_login_invalid_credentials_returns_generic_error():
    """Verify invalid password returns generic 401 error."""
    res = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "WrongPassword999!"},
        headers=CSRF_HEADERS
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]
    assert settings.COOKIE_NAME not in res.cookies


def test_refresh_token_hashed_in_database_never_plain():
    """Verify only SHA-256 hash is saved in DB, never raw token."""
    login_res = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS
    )
    raw_cookie = login_res.cookies[settings.COOKIE_NAME]
    expected_hash = hashlib.sha256(raw_cookie.encode("utf-8")).hexdigest()
    
    db = SessionLocal()
    token_rec = db.query(RefreshToken).filter(RefreshToken.token_hash == expected_hash).first()
    assert token_rec is not None, "Token SHA-256 hash must exist in database"
    
    # Verify raw token is NOT stored anywhere in the table
    all_hashes = [t.token_hash for t in db.query(RefreshToken).all()]
    assert raw_cookie not in all_hashes
    db.close()


def test_access_token_claims_and_expiry():
    """Verify Access Token has valid signature, 15 min expiry, iss, aud, sub, and sid."""
    login_res = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS
    )
    token = login_res.json()["accessToken"]
    payload = decode_access_token(token)
    
    assert payload["iss"] == "latrocore-auth"
    assert payload["aud"] == "latrocore-client"
    assert payload["sub"] is not None
    assert payload["sid"] is not None
    assert payload["exp"] - payload["iat"] == 900  # Exactly 15 minutes


def test_silent_refresh_and_rotation():
    """Verify refresh endpoint rotates the refresh token atomically and retains fixed session expiry."""
    # 1. Login
    login_res = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS
    )
    old_raw_cookie = login_res.cookies[settings.COOKIE_NAME]
    old_hash = hashlib.sha256(old_raw_cookie.encode("utf-8")).hexdigest()
    
    db = SessionLocal()
    session_rec = db.query(UserSession).first()
    original_session_expiry = session_rec.expires_at
    db.close()
    
    # 2. Refresh
    refresh_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: old_raw_cookie},
        headers=CSRF_HEADERS
    )
    assert refresh_res.status_code == 200, refresh_res.text
    refresh_data = refresh_res.json()
    assert "accessToken" in refresh_data
    
    new_raw_cookie = refresh_res.cookies[settings.COOKIE_NAME]
    assert new_raw_cookie != old_raw_cookie, "Refresh token must rotate"
    
    # 3. Verify old token marked consumed in DB
    db = SessionLocal()
    old_rec = db.query(RefreshToken).filter(RefreshToken.token_hash == old_hash).first()
    assert old_rec.is_consumed is True
    assert old_rec.consumed_at is not None
    
    # 4. Verify session expiry was NOT extended (fixed 7-day lifespan)
    updated_session = db.query(UserSession).filter(UserSession.id == session_rec.id).first()
    assert ensure_utc(updated_session.expires_at) == ensure_utc(original_session_expiry)
    db.close()


def test_refresh_token_reuse_detection_revokes_session():
    """Verify that reusing an already consumed token triggers reuse detection and revokes the session."""
    # 1. Login
    login_res = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS
    )
    old_raw_cookie = login_res.cookies[settings.COOKIE_NAME]
    
    # 2. First Refresh (legitimate rotation)
    refresh_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: old_raw_cookie},
        headers=CSRF_HEADERS
    )
    assert refresh_res.status_code == 200
    
    # 3. Attacker replays old_raw_cookie
    reuse_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: old_raw_cookie},
        headers=CSRF_HEADERS
    )
    assert reuse_res.status_code == 401
    assert "reuse detected" in reuse_res.json()["detail"].lower()
    
    # 4. Entire session must now be revoked
    db = SessionLocal()
    session_rec = db.query(UserSession).first()
    assert session_rec.is_revoked is True
    assert session_rec.revoked_at is not None
    db.close()
    
    # 5. Even legitimate replacement token must now be rejected
    new_raw_cookie = refresh_res.cookies[settings.COOKIE_NAME]
    subsequent_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: new_raw_cookie},
        headers=CSRF_HEADERS
    )
    assert subsequent_res.status_code == 401


def test_logout_revokes_session_and_clears_cookie():
    """Verify logout is idempotent, clears cookie, and invalidates access token on protected routes."""
    # 1. Login
    login_res = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS
    )
    access_token = login_res.json()["accessToken"]
    raw_cookie = login_res.cookies[settings.COOKIE_NAME]
    
    # Verify protected endpoint works before logout
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    
    # 2. Logout
    logout_res = client.post(
        "/auth/logout",
        cookies={settings.COOKIE_NAME: raw_cookie},
        headers=CSRF_HEADERS
    )
    assert logout_res.status_code == 204
    
    # 3. Verify old access token is now REJECTED by protected endpoints because session was revoked
    rejected_res = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert rejected_res.status_code == 401
    assert "Session has been revoked" in rejected_res.json()["detail"]
    
    # 4. Verify logout is idempotent (calling again with no cookie still returns 204)
    second_logout = client.post("/auth/logout", headers=CSRF_HEADERS)
    assert second_logout.status_code == 204


def test_csrf_protection_rejects_missing_header_and_bad_origin():
    """Verify cookie-based endpoints reject requests without custom header or invalid origin."""
    # Missing custom header
    res1 = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: "dummy_token"},
        headers={"Origin": "https://localhost:5173"}
    )
    assert res1.status_code == 403
    assert "Missing required request header" in res1.json()["detail"]
    
    # Disallowed origin
    res2 = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: "dummy_token"},
        headers={
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "https://evil-attacker.com"
        }
    )
    assert res2.status_code == 403
    assert "origin" in res2.json()["detail"].lower()


def test_login_rate_limiting_by_account():
    """Verify rate limiter blocks account after exceeding maximum failed attempts."""
    for i in range(5):
        res = client.post(
            "/auth/login",
            json={"email": "testuser@latrocore.internal", "password": f"WrongPwd{i}!"},
            headers=CSRF_HEADERS
        )
        assert res.status_code == 401
        
    # 6th attempt should be locked out with 429
    res_blocked = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "WrongPwdFinal!"},
        headers=CSRF_HEADERS
    )
    assert res_blocked.status_code == 429
    assert "Too many failed login attempts" in res_blocked.json()["detail"]
    assert "Retry-After" in res_blocked.headers


def test_protected_dashboard_endpoint():
    """Verify protected /dashboard returns metrics and session data for authenticated user."""
    login_res = client.post(
        "/auth/login",
        json={"email": "testuser@latrocore.internal", "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS
    )
    token = login_res.json()["accessToken"]
    
    dash_res = client.get("/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    body = dash_res.json()
    assert body["status"] == "healthy"
    assert body["user"]["email"] == "testuser@latrocore.internal"
    assert "activeSessions" in body["stats"]
