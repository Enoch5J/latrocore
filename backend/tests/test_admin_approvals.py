import pytest
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.models import User, Patient, DoctorProfile, PharmacistProfile, EmailVerificationOTP
from app.core.security import hash_password, create_access_token

client = TestClient(app)

CUSTOM_HEADERS = {
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "http://localhost:5173"
}


def get_admin_headers():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            admin = User(
                email="admin.test@latrocore.internal",
                name="Test Admin",
                password_hash=hash_password("AdminPass123#"),
                role="admin",
                status="active",
                verified=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # Create session in db
        from app.models.models import Session as UserSession
        sess = UserSession(
            user_id=admin.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
            ip_address="127.0.0.1",
            user_agent="pytest"
        )
        db.add(sess)
        db.commit()
        db.refresh(sess)

        token, _ = create_access_token(user_id=admin.id, session_id=sess.id, role=admin.role)
        return {
            "Authorization": f"Bearer {token}",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "http://localhost:5173"
        }
    finally:
        db.close()


def test_patient_doctor_pharmacist_approval_workflow():
    db = SessionLocal()
    try:
        import secrets
        now = datetime.now(timezone.utc)
        admin_headers = get_admin_headers()

        # 1. Clean up old test data
        test_patient_email = "approvals.patient@latrocore.com"
        test_doctor_email = "approvals.doctor@latrocore.com"
        test_pharm_email = "approvals.pharm@latrocore.com"

        for em in [test_patient_email, test_doctor_email, test_pharm_email]:
            db.query(User).filter(User.email == em).delete()
            db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == em).delete()
        db.commit()

        pat_token_str = secrets.token_urlsafe(16)
        pharm_token_str = secrets.token_urlsafe(16)
        doc_token_str = secrets.token_urlsafe(16)

        # 2. Register Patient -> Must be pending
        otp_pat = EmailVerificationOTP(
            email=test_patient_email,
            otp_hash="mock",
            purpose="patient_signup",
            token=pat_token_str,
            is_verified=True,
            is_consumed=False,
            expires_at=now + timedelta(minutes=5),
            token_expires_at=now + timedelta(minutes=15)
        )
        db.add(otp_pat)
        db.commit()

        res_pat = client.post("/auth/register/patient", json={
            "name": "Ananya Roy",
            "email": test_patient_email,
            "phone": "9811122233",
            "countryCode": "+91",
            "age": 42,
            "conditions": ["Type 2 Diabetes"],
            "password": "Password123#Secure",
            "confirmPassword": "Password123#Secure",
            "verificationToken": pat_token_str,
            "consentHealthData": True,
            "acceptTerms": True
        }, headers=CUSTOM_HEADERS)

        if res_pat.status_code != 200:
            print("res_pat error:", res_pat.json())
        assert res_pat.status_code == 200
        pat_data = res_pat.json()
        assert pat_data["user"]["status"] == "pending"
        assert pat_data["user"]["approvalStatus"] == "pending"
        pat_display_id = pat_data["user"]["displayId"]
        assert pat_display_id.startswith("PAT-")
        pat_token = pat_data["accessToken"]

        # 3. Check status endpoint for patient while pending
        pat_headers = {
            "Authorization": f"Bearer {pat_token}",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": "http://localhost:5173"
        }
        res_status = client.get("/auth/status", headers=pat_headers)
        assert res_status.status_code == 200
        status_info = res_status.json()
        assert status_info["status"] == "pending"
        assert status_info["approvalStatus"] == "pending"
        assert status_info["displayId"] == pat_display_id

        # 4. Check admin approvals summary
        res_summary = client.get("/admin/approvals/summary", headers=admin_headers)
        assert res_summary.status_code == 200
        summary_data = res_summary.json()
        assert summary_data["pendingPatients"] >= 1

        # 5. List pending patients in admin
        res_pending_pats = client.get("/admin/patients/pending", headers=admin_headers)
        assert res_pending_pats.status_code == 200
        pending_list = res_pending_pats.json()
        matching_pat = next((p for p in pending_list if p["email"] == test_patient_email), None)
        assert matching_pat is not None
        assert matching_pat["name"] == "Ananya Roy"

        # 6. Admin approves patient
        res_app_pat = client.post(f"/admin/patients/{matching_pat['id']}/approve", headers=admin_headers)
        assert res_app_pat.status_code == 200
        assert res_app_pat.json()["status"] == "approved"

        # 7. Check patient status again -> Now approved!
        res_status_after = client.get("/auth/status", headers=pat_headers)
        assert res_status_after.status_code == 200
        assert res_status_after.json()["status"] == "active"
        assert res_status_after.json()["approvalStatus"] == "approved"

        # 8. Register Pharmacist -> Must be pending
        otp_pharm = EmailVerificationOTP(
            email=test_pharm_email,
            otp_hash="mock",
            purpose="pharmacist_signup",
            token=pharm_token_str,
            is_verified=True,
            is_consumed=False,
            expires_at=now + timedelta(minutes=5),
            token_expires_at=now + timedelta(minutes=15)
        )
        db.add(otp_pharm)
        db.commit()

        res_pharm = client.post("/auth/register/pharmacist", json={
            "name": "Kavita Nair",
            "email": test_pharm_email,
            "phone": "9822233344",
            "countryCode": "+91",
            "licenseNumber": "KSPC-889922",
            "council": "Karnataka State Pharmacy Council",
            "specialization": "Clinical Pharmacist",
            "pharmacyName": "Apollo Clinical Pharmacy",
            "password": "Password123#Secure",
            "confirmPassword": "Password123#Secure",
            "verificationToken": pharm_token_str,
            "acceptTerms": True
        }, headers=CUSTOM_HEADERS)

        assert res_pharm.status_code == 200
        pharm_data = res_pharm.json()
        assert pharm_data["user"]["status"] == "pending"
        assert pharm_data["user"]["approvalStatus"] == "pending"
        assert pharm_data["user"]["displayId"].startswith("PHARM-")

        # 9. Admin lists pending pharmacists
        res_pending_pharms = client.get("/admin/pharmacists/pending", headers=admin_headers)
        assert res_pending_pharms.status_code == 200
        matching_pharm = next((p for p in res_pending_pharms.json() if p["email"] == test_pharm_email), None)
        assert matching_pharm is not None

        # 10. Admin approves pharmacist
        res_app_pharm = client.post(f"/admin/pharmacists/{matching_pharm['id']}/approve", headers=admin_headers)
        assert res_app_pharm.status_code == 200
        assert res_app_pharm.json()["status"] == "approved"

        # 11. Verify pharmacist user is now active in DB
        updated_pharm_user = db.query(User).filter(User.email == test_pharm_email).first()
        assert updated_pharm_user.status == "active"

        # 12. Batch approve test
        otp_doc = EmailVerificationOTP(
            email=test_doctor_email,
            otp_hash="mock",
            purpose="doctor_signup",
            token=doc_token_str,
            is_verified=True,
            is_consumed=False,
            expires_at=now + timedelta(minutes=5),
            token_expires_at=now + timedelta(minutes=15)
        )
        db.add(otp_doc)
        db.commit()

        res_doc = client.post("/auth/register/doctor", json={
            "name": "Dr. Sameer Patel",
            "email": test_doctor_email,
            "phone": "9833344455",
            "countryCode": "+91",
            "licenseNumber": "MCI-778899",
            "council": "Medical Council of India",
            "specialization": "Diabetology",
            "hospitalClinic": "Metro Endocrine Care",
            "password": "Password123#Secure",
            "confirmPassword": "Password123#Secure",
            "verificationToken": doc_token_str,
            "acceptTerms": True
        }, headers=CUSTOM_HEADERS)
        assert res_doc.status_code == 200
        doc_user_id = res_doc.json()["user"]["id"]

        # Batch approve the doctor
        res_batch = client.post("/admin/approvals/batch-approve", json={
            "doctorProfileIds": [doc_user_id],
            "pharmacistProfileIds": [],
            "patientIds": []
        }, headers=admin_headers)
        assert res_batch.status_code == 200
        assert res_batch.json()["approvedCount"] >= 1

        updated_doc = db.query(User).filter(User.id == doc_user_id).first()
        assert updated_doc.status == "active"

    finally:
        db.close()
