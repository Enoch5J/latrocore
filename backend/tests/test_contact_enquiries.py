from datetime import datetime, timedelta, timezone

import pytest
from starlette.testclient import TestClient

import main
from app.core.database import Base, SessionLocal, engine
from app.core.security import create_access_token, hash_password
from app.models.models import ContactEnquiry, RateLimitAttempt, Session as UserSession, User

client = TestClient(main.app, base_url="https://localhost:5173")

CSRF_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://localhost:5173",
}


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(RateLimitAttempt).filter(RateLimitAttempt.key.like("contact:%")).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
    yield


def _token_for_role(role: str):
    db = SessionLocal()
    try:
        email = f"{role}.contacttest@latrocore.com"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                name=f"Contact {role.title()}",
                password_hash=hash_password("LatroContact123!"),
                role=role,
                status="active",
                verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        sess = UserSession(
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            ip_address="127.0.0.1",
        )
        db.add(sess)
        db.commit()
        db.refresh(sess)
        token, _ = create_access_token(user_id=user.id, session_id=sess.id, role=user.role)
        return token
    finally:
        db.close()


def test_public_visitor_can_submit_contact_enquiry_without_signing_in():
    payload = {
        "full_name": "Meera Krishnan",
        "email": "Meera.Krishnan@example.com",
        "phone": "+91 98765 43210",
        "topic": "Getting started",
        "message": "I would like to understand how families coordinate daily reminders.",
    }
    res = client.post("/api/v1/contact/enquiries", json=payload, headers=CSRF_HEADERS)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "received"
    assert data["message"] == "Thank you. Your message has been received."
    enquiry_id = data["id"]

    db = SessionLocal()
    try:
        row = db.query(ContactEnquiry).filter(ContactEnquiry.id == enquiry_id).first()
        assert row is not None
        assert row.full_name == "Meera Krishnan"
        assert row.email == "meera.krishnan@example.com"
        assert row.topic == "Getting started"
        db.delete(row)
        db.commit()
    finally:
        db.close()


def test_contact_enquiry_rejects_invalid_fields_and_honeypot_spam():
    # Invalid email
    assert client.post(
        "/api/v1/contact/enquiries",
        json={
            "full_name": "Arun",
            "email": "not-an-email",
            "topic": "Other",
            "message": "Hello team, please reach out.",
        },
        headers=CSRF_HEADERS,
    ).status_code == 422
    for invalid_email in ("arun..nair@example.com", "arun@-example.com", "arun@example..com"):
        assert client.post(
            "/api/v1/contact/enquiries",
            json={
                "full_name": "Arun Nair",
                "email": invalid_email,
                "topic": "Other",
                "message": "Please contact me about my enquiry.",
            },
            headers=CSRF_HEADERS,
        ).status_code == 422

    # Missing full name / whitespace
    assert client.post(
        "/api/v1/contact/enquiries",
        json={
            "full_name": " ",
            "email": "arun@example.com",
            "topic": "Account support",
            "message": "Need help resetting my login.",
        },
        headers=CSRF_HEADERS,
    ).status_code == 422

    # Unsupported topic
    assert client.post(
        "/api/v1/contact/enquiries",
        json={
            "full_name": "Arun Nair",
            "email": "arun@example.com",
            "topic": "Sales Spam",
            "message": "Need help resetting my login.",
        },
        headers=CSRF_HEADERS,
    ).status_code == 422

    # Honeypot filled -> rejected without persisting
    res_bot = client.post(
        "/api/v1/contact/enquiries",
        json={
            "full_name": "Bot Sender",
            "email": "bot@example.com",
            "topic": "Other",
            "message": "Buy cheap products here!",
            "website": "https://spam.example.com",
        },
        headers=CSRF_HEADERS,
    )
    assert res_bot.status_code == 422


def test_contact_enquiry_admin_listing_requires_admin_and_rate_limits_flood():
    # Guest & non-admin cannot read stored enquiries
    assert client.get("/api/v1/contact/enquiries").status_code == 401
    pat_token = _token_for_role("patient")
    assert client.get(
        "/api/v1/contact/enquiries",
        headers={"Authorization": f"Bearer {pat_token}"},
    ).status_code == 403

    adm_token = _token_for_role("admin")
    res_admin = client.get(
        "/api/v1/contact/enquiries",
        headers={"Authorization": f"Bearer {adm_token}"},
    )
    assert res_admin.status_code == 200
    assert "enquiries" in res_admin.json()

    # Rate limit after 10 submissions from same IP
    created_ids = []
    try:
        for i in range(10):
            r = client.post(
                "/api/v1/contact/enquiries",
                json={
                    "full_name": f"Visitor {i}",
                    "email": f"visitor{i}@example.com",
                    "topic": "Using Latrocore",
                    "message": "Testing rate limit handling cleanly.",
                },
                headers=CSRF_HEADERS,
            )
            assert r.status_code == 201
            created_ids.append(r.json()["id"])

        r_limited = client.post(
            "/api/v1/contact/enquiries",
            json={
                "full_name": "Visitor Excess",
                "email": "excess@example.com",
                "topic": "Using Latrocore",
                "message": "This eleventh submission should be rate-limited.",
            },
            headers=CSRF_HEADERS,
        )
        assert r_limited.status_code == 429
    finally:
        db = SessionLocal()
        try:
            if created_ids:
                db.query(ContactEnquiry).filter(ContactEnquiry.id.in_(created_ids)).delete(synchronize_session=False)
                db.commit()
        finally:
            db.close()
