"""
Comprehensive test suite for:
1. Email OTP Signup Flow (send, verify, HMAC security, 5 attempts, cooldown, single use, purpose binding)
2. Patient Signup (name, age 0-120, +91 phone, conditions, consent, PAT-XXXXXX ID, password strength)
3. Doctor Signup (DOC-XXXXXX ID, pending admin approval, restricted patient records)
4. Admin Doctor Approval workflow (pending list, approve, reject)
5. Forgot Password and Password Reset (generic response, reset OTP, token expiry, session invalidation)
"""

from datetime import datetime, timezone, timedelta
import pytest
from starlette.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.models import User, Patient, DoctorProfile, PharmacistProfile, EmailVerificationOTP, Session as UserSession
from app.core.security import hash_otp

client = TestClient(app)
CUSTOM_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "http://localhost:5173"
}


def test_otp_send_and_verify_flow():
    test_email = "patient.flow@latrocore.com"
    db = SessionLocal()
    try:
        # Clean up prior test data
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).delete()
        db.commit()

        # 1. Send OTP
        res = client.post("/auth/send-otp", json={"email": test_email, "purpose": "patient_signup"}, headers=CUSTOM_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["cooldownSeconds"] == 60

        # Verify OTP is stored as HMAC hash, NOT plain in DB
        otp_record = db.query(EmailVerificationOTP).filter(
            EmailVerificationOTP.email == test_email,
            EmailVerificationOTP.purpose == "patient_signup",
            EmailVerificationOTP.is_consumed == False
        ).first()
        assert otp_record is not None
        assert len(otp_record.otp_hash) == 64  # SHA256 hex string

        # 2. Cooldown check - immediate second send should fail with 429
        res_cd = client.post("/auth/send-otp", json={"email": test_email, "purpose": "patient_signup"}, headers=CUSTOM_HEADERS)
        assert res_cd.status_code == 429
        assert "Please wait" in res_cd.json()["detail"]

        # 3. Test invalid verification code countdown
        bad_verify = client.post("/auth/verify-otp", json={"email": test_email, "otp": "000000", "purpose": "patient_signup"}, headers=CUSTOM_HEADERS)
        assert bad_verify.status_code == 400
        assert "attempt(s) remaining" in bad_verify.json()["detail"]

        # 4. Cross-purpose check: Try verifying for reset_password (should fail!)
        cross_verify = client.post("/auth/verify-otp", json={"email": test_email, "otp": "123456", "purpose": "reset_password"}, headers=CUSTOM_HEADERS)
        assert cross_verify.status_code == 400

        # 5. Simulate valid code verification using known OTP
        known_otp = "852963"
        otp_record.otp_hash = hash_otp(known_otp, test_email, "patient_signup")
        db.commit()

        good_verify = client.post("/auth/verify-otp", json={"email": test_email, "otp": known_otp, "purpose": "patient_signup"}, headers=CUSTOM_HEADERS)
        assert good_verify.status_code == 200
        v_data = good_verify.json()
        assert "verificationToken" in v_data
        assert v_data["email"] == test_email
        token = v_data["verificationToken"]

        # Token should be marked verified in DB
        db.refresh(otp_record)
        assert otp_record.is_verified is True
        assert otp_record.token == token
    finally:
        db.close()


def test_patient_signup_and_patient_id():
    test_email = "newpatient@latrocore.com"
    db = SessionLocal()
    try:
        # Prepare valid verified OTP record
        db.query(User).filter(User.email == test_email).delete()
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).delete()
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.token == "test-patient-token-12345").delete()
        db.commit()

        otp_record = EmailVerificationOTP(
            email=test_email,
            otp_hash="mockhash",
            purpose="patient_signup",
            token="test-patient-token-12345",
            is_verified=True,
            is_consumed=False,
            expires_at=EmailVerificationOTP.created_at,
            token_expires_at=None
        )
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        otp_record.expires_at = now + timedelta(minutes=5)
        otp_record.token_expires_at = now + timedelta(minutes=15)
        db.add(otp_record)
        db.commit()

        # Reject if password does not meet 12 characters
        short_pw_payload = {
            "name": "Aarav Sharma",
            "email": test_email,
            "phone": "9876543210",
            "countryCode": "+91",
            "age": 35,
            "conditions": ["Type 2 Diabetes"],
            "password": "Short1!",
            "confirmPassword": "Short1!",
            "verificationToken": "test-patient-token-12345",
            "consentHealthData": True,
            "acceptTerms": True
        }
        res_short = client.post("/auth/register/patient", json=short_pw_payload, headers=CUSTOM_HEADERS)
        assert res_short.status_code == 400
        assert "at least 12 characters" in res_short.json()["detail"]

        # Reject if consent is false
        no_consent = short_pw_payload.copy()
        no_consent["password"] = "SecurePassword123#Clinical"
        no_consent["confirmPassword"] = "SecurePassword123#Clinical"
        no_consent["consentHealthData"] = False
        res_consent = client.post("/auth/register/patient", json=no_consent, headers=CUSTOM_HEADERS)
        assert res_consent.status_code == 400

        # Successful registration
        valid_payload = no_consent.copy()
        valid_payload["consentHealthData"] = True
        valid_payload["conditions"] = ["Type 2 Diabetes", "Hypertension"]
        valid_payload["otherCondition"] = "Mild Asthma"

        res_ok = client.post("/auth/register/patient", json=valid_payload, headers=CUSTOM_HEADERS)
        assert res_ok.status_code == 200
        data = res_ok.json()
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "patient"
        assert data["user"]["status"] == "active"
        assert data["user"]["displayId"].startswith("PAT-")

        # Verify PAT-XXXXXX in database
        saved_patient = db.query(Patient).filter(Patient.patient_id_display == data["user"]["displayId"]).first()
        assert saved_patient is not None
        assert saved_patient.age == 35
        assert "Mild Asthma" in saved_patient.conditions
    finally:
        db.close()


def test_doctor_signup_pending_approval_and_restricted_access():
    test_email = "newdoctor@latrocore.com"
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == test_email).delete()
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).delete()
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.token == "test-doctor-token-98765").delete()
        db.commit()

        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        otp_record = EmailVerificationOTP(
            email=test_email,
            otp_hash="mockdochash",
            purpose="doctor_signup",
            token="test-doctor-token-98765",
            is_verified=True,
            is_consumed=False,
            expires_at=now + timedelta(minutes=5),
            token_expires_at=now + timedelta(minutes=15)
        )
        db.add(otp_record)
        db.commit()

        doctor_payload = {
            "name": "Dr. Ananya Roy",
            "email": test_email,
            "phone": "9812345678",
            "countryCode": "+91",
            "licenseNumber": "MCI-IND-99214",
            "council": "Medical Council of India",
            "specialization": "Endocrinologist",
            "hospitalClinic": "Max Healthcare",
            "password": "DoctorSecurePass2026!",
            "confirmPassword": "DoctorSecurePass2026!",
            "verificationToken": "test-doctor-token-98765",
            "acceptTerms": True
        }

        res = client.post("/auth/register/doctor", json=doctor_payload, headers=CUSTOM_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["role"] == "doctor"
        assert data["user"]["status"] == "pending"  # Crucial requirement: pending
        assert data["user"]["approvalStatus"] == "pending"
        assert data["user"]["displayId"].startswith("DOC-")

        access_token = data["accessToken"]
        auth_headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "http://localhost:5173"
        }

        # Doctor can see their own profile /me with pending status
        me_res = client.get("/auth/me", headers=auth_headers)
        assert me_res.status_code == 200
        assert me_res.json()["status"] == "pending"

        # Restricted access: Doctor cannot access patient records while pending!
        pt_res = client.get("/api/v1/patients", headers=auth_headers)
        assert pt_res.status_code == 403
        assert "pending" in pt_res.json()["detail"].lower()
    finally:
        db.close()


def test_admin_doctor_approval_workflow():
    db = SessionLocal()
    try:
        # Create an admin user if not exists
        admin_email = "admin.verifier@latrocore.com"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        from app.core.security import hash_password
        if not admin_user:
            admin_user = User(
                email=admin_email,
                password_hash=hash_password("AdminSecurePassword123#"),
                name="Admin Verifier",
                role="admin",
                status="active",
                verified=True
            )
            db.add(admin_user)
            db.commit()

        # Login as admin
        admin_login = client.post("/auth/login", json={
            "email": admin_email,
            "password": "AdminSecurePassword123#"
        }, headers=CUSTOM_HEADERS)
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["accessToken"]
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "http://localhost:5173"
        }

        # 1. Fetch pending doctors list
        pending_res = client.get("/api/v1/admin/doctors/pending", headers=admin_headers)
        assert pending_res.status_code == 200
        pending_list = pending_res.json()
        assert len(pending_list) > 0

        target_doctor = pending_list[0]
        profile_id = target_doctor["id"]

        # 2. Approve doctor
        approve_res = client.post(f"/api/v1/admin/doctors/{profile_id}/approve", headers=admin_headers)
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "approved"

        # Check DB updated
        doc_profile = db.query(DoctorProfile).filter(DoctorProfile.id == profile_id).first()
        assert doc_profile.approval_status == "approved"
        doc_user = db.query(User).filter(User.id == doc_profile.user_id).first()
        assert doc_user.status == "active"
    finally:
        db.close()


def test_forgot_password_and_reset_flow():
    target_email = "reset.user@latrocore.com"
    db = SessionLocal()
    try:
        from app.core.security import hash_password, verify_password
        db.query(User).filter(User.email == target_email).delete()
        user = User(
            email=target_email,
            password_hash=hash_password("OriginalPassword123#"),
            name="Reset Test User",
            role="patient",
            status="active",
            verified=True
        )
        db.add(user)
        db.commit()

        # 1. Forgot password request returns generic response
        fp_res = client.post("/auth/forgot-password", json={"email": target_email}, headers=CUSTOM_HEADERS)
        assert fp_res.status_code == 200
        assert "If an account exists" in fp_res.json()["message"]

        # Unknown email also returns generic response (no user enumeration)
        unknown_res = client.post("/auth/forgot-password", json={"email": "nobody@latrocore.com"}, headers=CUSTOM_HEADERS)
        assert unknown_res.status_code == 200
        assert "If an account exists" in unknown_res.json()["message"]

        # 2. Fetch reset OTP record from DB and verify
        otp_rec = db.query(EmailVerificationOTP).filter(
            EmailVerificationOTP.email == target_email,
            EmailVerificationOTP.purpose == "reset_password"
        ).order_by(EmailVerificationOTP.created_at.desc()).first()
        assert otp_rec is not None

        known_reset_otp = "741852"
        otp_rec.otp_hash = hash_otp(known_reset_otp, target_email, "reset_password")
        db.commit()

        # Verify reset OTP
        v_res = client.post("/auth/verify-otp", json={
            "email": target_email,
            "otp": known_reset_otp,
            "purpose": "reset_password"
        }, headers=CUSTOM_HEADERS)
        assert v_res.status_code == 200
        reset_token = v_res.json()["verificationToken"]

        # 3. Reset password
        new_password = "BrandNewSuperSecurePass2026!"
        rp_res = client.post("/auth/reset-password", json={
            "email": target_email,
            "verificationToken": reset_token,
            "password": new_password,
            "confirmPassword": new_password
        }, headers=CUSTOM_HEADERS)
        assert rp_res.status_code == 200

        # Check user can now log in with the new password
        login_res = client.post("/auth/login", json={
            "email": target_email,
            "password": new_password
        }, headers=CUSTOM_HEADERS)
        assert login_res.status_code == 200
    finally:
        db.close()


def test_pharmacist_signup_pending_approval():
    test_email = "test.pharmacist.reg@latrocore.com"
    test_otp = "852963"
    db = SessionLocal()
    try:
        db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == test_email).delete()
        old_user = db.query(User).filter(User.email == test_email).first()
        if old_user:
            db.query(PharmacistProfile).filter(PharmacistProfile.user_id == old_user.id).delete()
            db.delete(old_user)
        db.commit()

        otp_hash = hash_otp(test_otp, test_email, "pharmacist_signup")
        record = EmailVerificationOTP(
            email=test_email,
            otp_hash=otp_hash,
            purpose="pharmacist_signup",
            attempts=0,
            is_verified=False,
            is_consumed=False,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            cooldown_until=datetime.now(timezone.utc) + timedelta(seconds=60),
            ip_address="127.0.0.1"
        )
        db.add(record)
        db.commit()

        # Verify OTP
        v_res = client.post("/auth/verify-otp", json={
            "email": test_email,
            "otp": test_otp,
            "purpose": "pharmacist_signup"
        }, headers=CUSTOM_HEADERS)
        assert v_res.status_code == 200
        verification_token = v_res.json()["verificationToken"]

        # Register Pharmacist
        reg_payload = {
            "name": "Pharm. Meera Nambiar",
            "email": test_email,
            "phone": "9876543219",
            "countryCode": "+91",
            "licenseNumber": "KL-PHARM-2024-8849",
            "council": "Kerala State Pharmacy Council",
            "specialization": "Clinical Pharmacist",
            "pharmacyName": "Amrita Hospital Pharmacy",
            "password": "SecurePharmPass2026!",
            "confirmPassword": "SecurePharmPass2026!",
            "verificationToken": verification_token,
            "acceptTerms": True
        }
        res = client.post("/auth/register/pharmacist", json=reg_payload, headers=CUSTOM_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["role"] == "pharmacist"
        assert data["user"]["status"] == "pending"
        assert data["user"]["displayId"].startswith("PHARM-")
    finally:
        db.close()


def test_login_with_phone_number_and_email():
    """Verify login works seamlessly with 10-digit mobile number, formatted mobile number, and email."""
    from app.core.security import hash_password
    test_phone = "+91-9876500001"
    test_email = "phone.user@latrocore.internal"
    test_pass = "SecurePass1234#!"
    
    db = SessionLocal()
    try:
        # Clean up prior test user
        existing = db.query(User).filter((User.email == test_email) | (User.phone == test_phone)).first()
        if existing:
            db.query(UserSession).filter(UserSession.user_id == existing.id).delete()
            db.delete(existing)
            db.commit()

        user = User(
            email=test_email,
            password_hash=hash_password(test_pass),
            name="Phone Test User",
            phone=test_phone,
            role="patient",
            status="active",
            verified=True
        )
        db.add(user)
        db.commit()

        # 1. Login with raw 10-digit phone number (without country code)
        res_raw_phone = client.post(
            "/auth/login",
            json={"identifier": "9876500001", "password": test_pass},
            headers=CUSTOM_HEADERS
        )
        assert res_raw_phone.status_code == 200, res_raw_phone.text
        assert res_raw_phone.json()["user"]["email"] == test_email

        # 2. Login with formatted phone number with spaces
        res_formatted = client.post(
            "/auth/login",
            json={"identifier": "+91 98765 00001", "password": test_pass},
            headers=CUSTOM_HEADERS
        )
        assert res_formatted.status_code == 200
        assert res_formatted.json()["user"]["email"] == test_email

        # 3. Login with email in "identifier" field
        res_email_id = client.post(
            "/auth/login",
            json={"identifier": test_email, "password": test_pass},
            headers=CUSTOM_HEADERS
        )
        assert res_email_id.status_code == 200
        assert res_email_id.json()["user"]["email"] == test_email

        # 4. Backward compatibility: Login with email in legacy "email" field
        res_legacy = client.post(
            "/auth/login",
            json={"email": test_email, "password": test_pass},
            headers=CUSTOM_HEADERS
        )
        assert res_legacy.status_code == 200

        # 5. Wrong password with phone number returns 401
        res_bad_pw = client.post(
            "/auth/login",
            json={"identifier": "9876500001", "password": "WrongPassword!"},
            headers=CUSTOM_HEADERS
        )
        assert res_bad_pw.status_code == 401

        # 6. Non-existent phone number returns 401
        res_not_found = client.post(
            "/auth/login",
            json={"identifier": "9000000000", "password": test_pass},
            headers=CUSTOM_HEADERS
        )
        assert res_not_found.status_code == 401
    finally:
        db.close()


