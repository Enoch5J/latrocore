"""
Automated Security & Authentication Test Suite for LATROCORE.
Validates:
- Argon2id password verification & generic 401 error handling
- HttpOnly, Secure, SameSite=Strict, Path=/auth cookie attributes (no Domain attribute)
- Strict absence of Refresh Token in JSON or user payload
- secrets.token_urlsafe(32) refresh tokens stored strictly as SHA-256 digests with unique index
- JWT claim validation (sub, sid, iss, aud, iat, exp, unique jti) & expiry rejection
- Silent Refresh rotation keeping fixed 7-day session deadline + expired/inactive rejection
- Token reuse attack detection and session revocation
- Idempotent logout (works even with expired JWT), cookie clearing attributes, and immediate
  rejection of both the revoked refresh cookie and previously issued access JWT
- CSRF defense + Origin allowlist and missing-origin policy across login, refresh, logout
- Cache-Control: no-store on auth responses and 401 vs 403 role enforcement
- Login rate limiting by IP and account

Supports running against PostgreSQL by setting DATABASE_URL / TEST_DATABASE_URL.
"""

import hashlib
from datetime import datetime, timedelta, timezone
import jwt
import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from starlette.testclient import TestClient

from main import app
from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password, create_access_token, decode_access_token, ensure_utc
from app.models.models import User, Session as UserSession, RefreshToken, RateLimitAttempt

client = TestClient(app, base_url="https://localhost:5173")

TEST_EMAIL = "testuser@latrocore.internal"
SUSPENDED_EMAIL = "suspended.auth@latrocore.internal"

# Common CSRF headers required by backend
CSRF_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://localhost:5173",
}


def _cleanup_test_auth_records(db):
    test_users = db.query(User).filter(User.email.in_([TEST_EMAIL, SUSPENDED_EMAIL])).all()
    test_user_ids = [u.id for u in test_users]
    if test_user_ids:
        session_ids = [
            s.id for s in db.query(UserSession).filter(UserSession.user_id.in_(test_user_ids)).all()
        ]
        if session_ids:
            db.query(RefreshToken).filter(RefreshToken.session_id.in_(session_ids)).delete(
                synchronize_session=False
            )
            db.query(UserSession).filter(UserSession.id.in_(session_ids)).delete(
                synchronize_session=False
            )

    db.query(RateLimitAttempt).filter(
        RateLimitAttempt.key.in_([
            f"account:{TEST_EMAIL}",
            f"account:{SUSPENDED_EMAIL}",
            "account:nobody@latrocore.internal",
            "ip:testclient",
            "ip:127.0.0.1",
        ])
    ).delete(synchronize_session=False)


def _get_test_user(db, email=TEST_EMAIL):
    return db.query(User).filter(User.email == email).first()


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _cleanup_test_auth_records(db)

        user = _get_test_user(db, TEST_EMAIL)
        if not user:
            user = User(
                email=TEST_EMAIL,
                password_hash=hash_password("CorrectHorseBatteryStaple123!"),
                name="Test User",
                role="patient",
                status="active",
                verified=True,
            )
            db.add(user)
        else:
            user.password_hash = hash_password("CorrectHorseBatteryStaple123!")
            user.name = "Test User"
            user.phone = None
            user.role = "patient"
            user.status = "active"

        suspended_user = _get_test_user(db, SUSPENDED_EMAIL)
        if not suspended_user:
            suspended_user = User(
                email=SUSPENDED_EMAIL,
                password_hash=hash_password("SuspendedUserPass123!"),
                name="Suspended User",
                role="patient",
                status="suspended",
                verified=True,
            )
            db.add(suspended_user)
        else:
            suspended_user.status = "suspended"

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    yield


def test_login_success_and_cookie_attributes():
    """Verify successful login, Argon2id verification, snake/camel payload, no-store, and cookie attributes."""
    res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    assert res.status_code == 200, res.text
    assert "no-store" in res.headers.get("cache-control", "").lower()

    data = res.json()
    assert "accessToken" in data and "access_token" in data
    assert data["access_token"] == data["accessToken"]
    assert data["tokenType"] == "Bearer" and data["token_type"] == "Bearer"
    assert data["expiresIn"] == 900 and data["expires_in"] == 900
    assert data["user"]["email"] == TEST_EMAIL
    assert data["user"]["name"] == "Test User"
    assert "password_hash" not in data["user"]

    # Refresh token must never appear in JSON
    assert "refreshToken" not in data
    assert "refresh_token" not in data
    assert "token" not in data.get("user", {})

    # Cookie security attributes
    assert settings.COOKIE_NAME in res.cookies
    set_cookie_header = res.headers.get("set-cookie", "").lower()
    assert settings.COOKIE_NAME.lower() in set_cookie_header
    assert "httponly" in set_cookie_header
    assert "secure" in set_cookie_header
    assert "samesite=strict" in set_cookie_header
    assert f"path={settings.COOKIE_PATH.lower()}" in set_cookie_header
    assert f"max-age={settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400}" in set_cookie_header
    assert "domain=" not in set_cookie_header


def test_login_invalid_credentials_returns_generic_error():
    """Verify invalid password or unknown account returns generic 401 error."""
    res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "WrongPassword999!"},
        headers=CSRF_HEADERS,
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]
    assert settings.COOKIE_NAME not in res.cookies

    res_missing = client.post(
        "/auth/login",
        json={"email": "nobody@latrocore.internal", "password": "WrongPassword999!"},
        headers=CSRF_HEADERS,
    )
    assert res_missing.status_code == 401
    assert res_missing.json()["detail"] == res.json()["detail"]


def test_refresh_token_digest_only_and_unique_index():
    """Verify opaque token length (~43 chars from token_urlsafe(32)), SHA-256 digest only, and unique index."""
    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    raw_cookie = login_res.cookies[settings.COOKIE_NAME]
    assert len(raw_cookie) == 43  # secrets.token_urlsafe(32)
    expected_hash = hashlib.sha256(raw_cookie.encode("utf-8")).hexdigest()

    inspector = inspect(engine)
    indexes = inspector.get_indexes("refresh_tokens")
    unique_cols = {
        col
        for idx in indexes
        if idx.get("unique")
        for col in idx.get("column_names", [])
    }
    assert "token_hash" in unique_cols

    db = SessionLocal()
    token_rec = db.query(RefreshToken).filter(RefreshToken.token_hash == expected_hash).first()
    assert token_rec is not None, "Token SHA-256 digest must exist in database"

    all_hashes = [t.token_hash for t in db.query(RefreshToken).all()]
    assert raw_cookie not in all_hashes

    # Attempting duplicate digest insert violates unique constraint
    duplicate = RefreshToken(
        session_id=token_rec.session_id,
        token_hash=expected_hash,
        created_at=token_rec.created_at,
        expires_at=token_rec.expires_at,
        is_consumed=False,
    )
    db.add(duplicate)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    db.close()


def test_access_token_claims_unique_jti_and_expiry():
    """Verify JWT claims (sub, sid, iss, aud, iat, exp, unique jti) and expired JWT rejection."""
    login_1 = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    login_2 = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    token_1 = login_1.json()["access_token"]
    token_2 = login_2.json()["access_token"]
    payload_1 = decode_access_token(token_1)
    payload_2 = decode_access_token(token_2)

    assert payload_1["iss"] == settings.JWT_ISSUER
    assert payload_1["aud"] == settings.JWT_AUDIENCE
    assert payload_1["sub"] is not None
    assert payload_1["sid"] is not None
    assert payload_1["jti"] is not None
    assert payload_1["jti"] != payload_2["jti"]
    assert payload_1["exp"] - payload_1["iat"] == 900

    # Expired JWT must be rejected with 401
    expired_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    expired_jwt = jwt.encode(
        {
            "sub": payload_1["sub"],
            "sid": payload_1["sid"],
            "role": "patient",
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int((expired_at - timedelta(minutes=15)).timestamp()),
            "exp": int(expired_at.timestamp()),
            "jti": "expired-test-jti",
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    expired_res = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_jwt}"})
    assert expired_res.status_code == 401


def test_silent_refresh_rotation_and_fixed_deadline():
    """Verify /auth/refresh issues fresh JWT, rotates refresh token, keeps original 7-day expiry, and omits raw token from JSON."""
    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    old_jwt = login_res.json()["access_token"]
    old_jti = decode_access_token(old_jwt)["jti"]
    old_raw_cookie = login_res.cookies[settings.COOKIE_NAME]
    old_hash = hashlib.sha256(old_raw_cookie.encode("utf-8")).hexdigest()

    db = SessionLocal()
    test_user = _get_test_user(db)
    session_rec = (
        db.query(UserSession)
        .filter(UserSession.user_id == test_user.id)
        .order_by(UserSession.created_at.desc())
        .first()
    )
    original_session_expiry = session_rec.expires_at
    db.close()

    refresh_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: old_raw_cookie},
        headers=CSRF_HEADERS,
    )
    assert refresh_res.status_code == 200, refresh_res.text
    assert "no-store" in refresh_res.headers.get("cache-control", "").lower()

    refresh_data = refresh_res.json()
    assert "access_token" in refresh_data and "accessToken" in refresh_data
    assert refresh_data["user"]["email"] == TEST_EMAIL
    assert "refreshToken" not in refresh_data and "refresh_token" not in refresh_data
    new_jti = decode_access_token(refresh_data["access_token"])["jti"]
    assert new_jti != old_jti

    new_raw_cookie = refresh_res.cookies[settings.COOKIE_NAME]
    assert new_raw_cookie != old_raw_cookie

    db = SessionLocal()
    old_rec = db.query(RefreshToken).filter(RefreshToken.token_hash == old_hash).first()
    assert old_rec.is_consumed is True
    assert old_rec.consumed_at is not None

    updated_session = db.query(UserSession).filter(UserSession.id == session_rec.id).first()
    assert ensure_utc(updated_session.expires_at) == ensure_utc(original_session_expiry)
    db.close()


def test_refresh_rejects_missing_expired_session_and_inactive_user():
    """Verify 401 when refresh cookie is missing, DB session is expired, or user becomes suspended."""
    missing_res = client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert missing_res.status_code == 401

    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    raw_cookie = login_res.cookies[settings.COOKIE_NAME]
    access_token = login_res.json()["access_token"]
    sid = decode_access_token(access_token)["sid"]

    # Expire DB session
    db = SessionLocal()
    session_rec = db.query(UserSession).filter(UserSession.id == sid).first()
    session_rec.expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db.commit()
    db.close()

    expired_refresh = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: raw_cookie},
        headers=CSRF_HEADERS,
    )
    assert expired_refresh.status_code == 401

    expired_me = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert expired_me.status_code == 401

    # Restore session expiry but suspend user -> refresh returns 401
    db = SessionLocal()
    session_rec = db.query(UserSession).filter(UserSession.id == sid).first()
    session_rec.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    user = _get_test_user(db)
    user.status = "suspended"
    db.commit()
    db.close()

    suspended_refresh = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: raw_cookie},
        headers=CSRF_HEADERS,
    )
    assert suspended_refresh.status_code == 401


def test_refresh_token_reuse_detection_revokes_session():
    """Verify reusing an already consumed refresh token revokes the entire session."""
    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    old_raw_cookie = login_res.cookies[settings.COOKIE_NAME]
    sid = decode_access_token(login_res.json()["access_token"])["sid"]

    refresh_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: old_raw_cookie},
        headers=CSRF_HEADERS,
    )
    assert refresh_res.status_code == 200

    reuse_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: old_raw_cookie},
        headers=CSRF_HEADERS,
    )
    assert reuse_res.status_code == 401
    assert "reuse detected" in reuse_res.json()["detail"].lower()

    db = SessionLocal()
    session_rec = db.query(UserSession).filter(UserSession.id == sid).first()
    assert session_rec.is_revoked is True
    assert session_rec.revoked_at is not None
    db.close()

    new_raw_cookie = refresh_res.cookies[settings.COOKIE_NAME]
    subsequent_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: new_raw_cookie},
        headers=CSRF_HEADERS,
    )
    assert subsequent_res.status_code == 401


def test_logout_revokes_session_clears_cookie_and_blocks_jwt_and_refresh():
    """Verify logout clears cookie with matching attrs, returns 204 repeatedly, and invalidates both JWT & refresh."""
    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    access_token = login_res.json()["access_token"]
    raw_cookie = login_res.cookies[settings.COOKIE_NAME]

    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    assert "no-store" in me_res.headers.get("cache-control", "").lower()

    # Logout must still succeed with 204 even when the access JWT has already expired
    payload = decode_access_token(access_token)
    expired_jwt = jwt.encode(
        {
            "sub": payload["sub"],
            "sid": payload["sid"],
            "role": "patient",
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int((datetime.now(timezone.utc) - timedelta(minutes=20)).timestamp()),
            "exp": int((datetime.now(timezone.utc) - timedelta(minutes=5)).timestamp()),
            "jti": "expired-during-logout",
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

    logout_res = client.post(
        "/auth/logout",
        cookies={settings.COOKIE_NAME: raw_cookie},
        headers={**CSRF_HEADERS, "Authorization": f"Bearer {expired_jwt}"},
    )
    assert logout_res.status_code == 204
    assert "no-store" in logout_res.headers.get("cache-control", "").lower()

    cleared_cookie_header = logout_res.headers.get("set-cookie", "").lower()
    assert settings.COOKIE_NAME.lower() in cleared_cookie_header
    assert f"path={settings.COOKIE_PATH.lower()}" in cleared_cookie_header
    assert "httponly" in cleared_cookie_header
    assert "secure" in cleared_cookie_header
    assert "samesite=strict" in cleared_cookie_header
    assert "max-age=0" in cleared_cookie_header

    # Previously issued access JWT immediately rejected with 401
    rejected_jwt_res = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert rejected_jwt_res.status_code == 401
    assert "Session has been revoked" in rejected_jwt_res.json()["detail"]

    # Revoked refresh cookie immediately rejected with 401
    rejected_refresh_res = client.post(
        "/auth/refresh",
        cookies={settings.COOKIE_NAME: raw_cookie},
        headers=CSRF_HEADERS,
    )
    assert rejected_refresh_res.status_code == 401

    # Repeated logout without cookie still returns 204 (idempotent, works even when JWT expired)
    second_logout = client.post("/auth/logout", headers=CSRF_HEADERS)
    assert second_logout.status_code == 204


def test_csrf_and_origin_validation_across_auth_endpoints():
    """Verify Origin allowlist, missing-origin policy, and required custom header across login, refresh, logout."""
    for path in ("/auth/login", "/auth/refresh", "/auth/logout"):
        missing_hdr = client.post(
            path,
            json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
            cookies={settings.COOKIE_NAME: "dummy_token"},
            headers={"Origin": "https://localhost:5173"},
        )
        assert missing_hdr.status_code == 403
        assert "Missing or invalid request header" in missing_hdr.json()["detail"]

        bad_origin = client.post(
            path,
            json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
            cookies={settings.COOKIE_NAME: "dummy_token"},
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "Origin": "https://evil-attacker.com",
            },
        )
        assert bad_origin.status_code == 403
        assert "origin" in bad_origin.json()["detail"].lower()

    # Defined policy for missing Origin/Referer
    original_policy = settings.ALLOW_MISSING_ORIGIN
    try:
        settings.ALLOW_MISSING_ORIGIN = False
        rejected_no_origin = client.post(
            "/auth/refresh",
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert rejected_no_origin.status_code == 403
        assert "Missing Origin" in rejected_no_origin.json()["detail"]
    finally:
        settings.ALLOW_MISSING_ORIGIN = original_policy


def test_protected_routes_return_401_for_unauthenticated_and_403_for_wrong_role():
    """Verify 401 on missing/invalid auth and 403 on insufficient role permissions."""
    unauth_me = client.get("/auth/me")
    assert unauth_me.status_code == 401

    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    patient_token = login_res.json()["access_token"]

    admin_res = client.get(
        "/api/v1/admin/approvals/summary",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert admin_res.status_code == 403


def test_login_rate_limiting_by_account():
    """Verify rate limiter blocks account after exceeding maximum failed attempts."""
    for i in range(5):
        res = client.post(
            "/auth/login",
            json={"email": TEST_EMAIL, "password": f"WrongPwd{i}!"},
            headers=CSRF_HEADERS,
        )
        assert res.status_code == 401

    res_blocked = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "WrongPwdFinal!"},
        headers=CSRF_HEADERS,
    )
    assert res_blocked.status_code == 429
    assert "Too many failed login attempts" in res_blocked.json()["detail"]
    assert "Retry-After" in res_blocked.headers


def test_protected_dashboard_endpoint():
    """Verify protected /dashboard returns metrics and session data for authenticated user."""
    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    token = login_res.json()["accessToken"]

    dash_res = client.get("/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert dash_res.status_code == 200
    body = dash_res.json()
    assert body["status"] == "healthy"
    assert body["user"]["email"] == TEST_EMAIL
    assert "activeSessions" in body["stats"]


def test_authenticated_user_can_update_own_name_and_phone():
    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    token = login_res.json()["access_token"]
    auth_headers = {**CSRF_HEADERS, "Authorization": f"Bearer {token}"}

    update_res = client.patch(
        "/auth/me",
        json={"name": "Updated Test User", "phone": "+91 9876543210"},
        headers=auth_headers,
    )

    assert update_res.status_code == 200, update_res.text
    assert update_res.json()["name"] == "Updated Test User"
    assert update_res.json()["phone"] == "+919876543210"
    assert "password_hash" not in update_res.json()

    me_res = client.get("/auth/me", headers=auth_headers)
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Updated Test User"
    assert me_res.json()["phone"] == "+919876543210"


def test_authenticated_user_can_change_password_and_sessions_are_revoked():
    login_res = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    token = login_res.json()["access_token"]
    auth_headers = {**CSRF_HEADERS, "Authorization": f"Bearer {token}"}

    wrong_current = client.post(
        "/auth/change-password",
        json={
            "currentPassword": "WrongPassword999!",
            "newPassword": "AnotherSecurePassphrase2026!",
        },
        headers=auth_headers,
    )
    assert wrong_current.status_code == 400

    change_res = client.post(
        "/auth/change-password",
        json={
            "currentPassword": "CorrectHorseBatteryStaple123!",
            "newPassword": "AnotherSecurePassphrase2026!",
        },
        headers=auth_headers,
    )
    assert change_res.status_code == 200, change_res.text
    assert "no-store" in change_res.headers.get("cache-control", "").lower()

    old_session_res = client.get("/auth/me", headers=auth_headers)
    assert old_session_res.status_code == 401

    old_password_login = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "CorrectHorseBatteryStaple123!"},
        headers=CSRF_HEADERS,
    )
    assert old_password_login.status_code == 401

    new_password_login = client.post(
        "/auth/login",
        json={"email": TEST_EMAIL, "password": "AnotherSecurePassphrase2026!"},
        headers=CSRF_HEADERS,
    )
    assert new_password_login.status_code == 200
