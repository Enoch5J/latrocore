"""Tests for seeded staff roles (pharmacist, doctor, admin) and absence of dummy patient portal accounts."""

from starlette.testclient import TestClient

import main
from app.core.database import DUMMY_PATIENT_EMAILS, SessionLocal, init_db_schema
from app.core.security import hash_password
from app.models.models import DoctorProfile, Patient, PharmacistProfile, User
from app.seeders.seed import seed

client = TestClient(main.app, base_url="https://localhost:5173")

CSRF_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://localhost:5173",
}


def test_seed_creates_pharmacist_and_doctor_without_dummy_patients():
    init_db_schema()
    seed()

    db = SessionLocal()
    try:
        pharmacist = db.query(User).filter(User.email == "pharmacist@latrocore.com").first()
        assert pharmacist is not None
        assert pharmacist.role == "pharmacist"
        assert pharmacist.status == "active"
        assert pharmacist.verified is True
        pharm_profile = db.query(PharmacistProfile).filter(PharmacistProfile.user_id == pharmacist.id).first()
        assert pharm_profile is not None
        assert pharm_profile.approval_status == "approved"

        doctor = db.query(User).filter(User.email == "doctor@latrocore.com").first()
        assert doctor is not None
        assert doctor.role == "doctor"
        assert doctor.status == "active"
        assert doctor.verified is True
        doc_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == doctor.id).first()
        assert doc_profile is not None
        assert doc_profile.approval_status == "approved"

        admin = db.query(User).filter(User.email == "admin@latrocore.com").first()
        assert admin is not None
        assert admin.role == "admin"
        assert admin.status == "active"

        dummy_patients = db.query(User).filter(User.email.in_(DUMMY_PATIENT_EMAILS)).all()
        assert dummy_patients == []
    finally:
        db.close()


def test_seeded_pharmacist_and_doctor_can_login_with_respective_roles():
    seed()

    pharm_res = client.post(
        "/auth/login",
        json={"identifier": "pharmacist@latrocore.com", "password": "care123"},
        headers=CSRF_HEADERS,
    )
    assert pharm_res.status_code == 200, pharm_res.text
    pharm_data = pharm_res.json()
    assert pharm_data["user"]["email"] == "pharmacist@latrocore.com"
    assert pharm_data["user"]["role"] == "pharmacist"
    assert pharm_data["user"]["status"] == "active"
    assert pharm_data["user"]["approvalStatus"] == "approved"
    assert pharm_data["user"]["displayId"] == "PHARM-100001"

    doc_res = client.post(
        "/auth/login",
        json={"identifier": "doctor@latrocore.com", "password": "doctor123"},
        headers=CSRF_HEADERS,
    )
    assert doc_res.status_code == 200, doc_res.text
    doc_data = doc_res.json()
    assert doc_data["user"]["email"] == "doctor@latrocore.com"
    assert doc_data["user"]["role"] == "doctor"
    assert doc_data["user"]["status"] == "active"
    assert doc_data["user"]["approvalStatus"] == "approved"
    assert doc_data["user"]["displayId"] == "DOC-100001"

    # Both seeded clinicians should be allowed past pending-approval check
    pharm_patients = client.get(
        "/api/v1/patients",
        headers={"Authorization": f"Bearer {pharm_data['accessToken']}"},
    )
    assert pharm_patients.status_code == 200, pharm_patients.text

    doc_patients = client.get(
        "/api/v1/patients",
        headers={"Authorization": f"Bearer {doc_data['accessToken']}"},
    )
    assert doc_patients.status_code == 200, doc_patients.text


def test_dummy_patient_portal_email_is_rejected_and_not_auto_seeded():
    seed()

    pat_res = client.post(
        "/auth/login",
        json={"identifier": "patient@latrocore.com", "password": "patient123"},
        headers=CSRF_HEADERS,
    )
    assert pat_res.status_code == 401

    db = SessionLocal()
    try:
        assert db.query(User).filter(User.email.in_(DUMMY_PATIENT_EMAILS)).all() == []
    finally:
        db.close()


def test_purge_demo_data_removes_dummy_patient_only_and_keeps_staff():
    seed()

    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "patient@latrocore.com").first():
            dummy_user = User(
                email="patient@latrocore.com",
                password_hash=hash_password("patient123"),
                name="Dummy Patient",
                role="patient",
                status="active",
                verified=True,
            )
            db.add(dummy_user)
            db.flush()
            db.add(Patient(user_id=dummy_user.id, patient_id_display="PAT-DUMMY", approval_status="approved"))
            db.commit()
    finally:
        db.close()

    admin_res = client.post(
        "/auth/login",
        json={"identifier": "admin@latrocore.com", "password": "admin123"},
        headers=CSRF_HEADERS,
    )
    assert admin_res.status_code == 200, admin_res.text
    admin_token = admin_res.json()["accessToken"]

    purge_res = client.post(
        "/admin/purge-demo-data",
        headers={**CSRF_HEADERS, "Authorization": f"Bearer {admin_token}"},
    )
    assert purge_res.status_code == 200, purge_res.text
    assert purge_res.json()["purgedCount"] >= 1

    db = SessionLocal()
    try:
        assert db.query(User).filter(User.email.in_(DUMMY_PATIENT_EMAILS)).all() == []
        assert db.query(User).filter(User.email == "doctor@latrocore.com").first() is not None
        assert db.query(User).filter(User.email == "pharmacist@latrocore.com").first() is not None
        assert db.query(User).filter(User.email == "admin@latrocore.com").first() is not None
    finally:
        db.close()
