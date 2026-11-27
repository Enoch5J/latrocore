"""
System initialization for LATROCORE.
Ensures baseline organization and staff accounts (admin, doctor, pharmacist)
exist with their respective roles, without seeding dummy patient accounts.
"""

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import func
from app.core.database import SessionLocal, engine, Base, purge_dummy_patient_accounts
from app.core.security import hash_password, verify_password
from app.models.models import Organization, User, DoctorProfile, PharmacistProfile


SEEDED_STAFF_ACCOUNTS = [
    {
        "id": "user-admin",
        "email": "admin@latrocore.com",
        "password": "admin123",
        "name": "System Admin",
        "phone": "+91-9876543200",
        "role": "admin",
    },
    {
        "id": "user-doctor",
        "email": "doctor@latrocore.com",
        "password": "doctor123",
        "name": "Dr. Priya Sharma",
        "phone": "+91-9876543210",
        "role": "doctor",
        "profile": {
            "display_id": "DOC-100001",
            "license_number": "MCI-2024-88910",
            "council": "Medical Council of India",
            "specialization": "Endocrinologist",
            "facility": "LATROCORE Central Clinic",
        },
    },
    {
        "id": "user-pharmacist",
        "email": "pharmacist@latrocore.com",
        "password": "care123",
        "name": "Pharm. Rajesh Kumar",
        "phone": "+91-9876543211",
        "role": "pharmacist",
        "profile": {
            "display_id": "PHARM-100001",
            "license_number": "PCI-2024-55421",
            "council": "Pharmacy Council of India",
            "specialization": "Clinical Pharmacist",
            "facility": "LATROCORE Clinical Pharmacy",
        },
    },
]


def _ensure_staff_profile(db, user: User, profile_cfg: dict, approved_by_id: str | None, now: datetime) -> None:
    """Create or verify an approved DoctorProfile or PharmacistProfile for seeded clinicians."""
    if user.role == "doctor":
        profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        if not profile:
            profile = DoctorProfile(
                user_id=user.id,
                doctor_id_display=profile_cfg["display_id"],
                license_number=profile_cfg["license_number"],
                council=profile_cfg["council"],
                specialization=profile_cfg["specialization"],
                hospital_clinic=profile_cfg["facility"],
                approval_status="approved",
                approved_by=approved_by_id,
                approved_at=now,
            )
            db.add(profile)
        else:
            profile.approval_status = "approved"
            profile.approved_by = profile.approved_by or approved_by_id
            profile.approved_at = profile.approved_at or now
            if not profile.doctor_id_display:
                profile.doctor_id_display = profile_cfg["display_id"]
    elif user.role == "pharmacist":
        profile = db.query(PharmacistProfile).filter(PharmacistProfile.user_id == user.id).first()
        if not profile:
            profile = PharmacistProfile(
                user_id=user.id,
                pharmacist_id_display=profile_cfg["display_id"],
                license_number=profile_cfg["license_number"],
                council=profile_cfg["council"],
                specialization=profile_cfg["specialization"],
                pharmacy_name=profile_cfg["facility"],
                approval_status="approved",
                approved_by=approved_by_id,
                approved_at=now,
            )
            db.add(profile)
        else:
            profile.approval_status = "approved"
            profile.approved_by = profile.approved_by or approved_by_id
            profile.approved_at = profile.approved_at or now
            if not profile.pharmacist_id_display:
                profile.pharmacist_id_display = profile_cfg["display_id"]


def seed():
    """Ensure baseline clinic organization and staff accounts exist without dummy patient records."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Remove any dummy patient checking portal accounts if previously present
        purge_dummy_patient_accounts(db)

        # ── Organization ──
        org = db.query(Organization).first()
        if not org:
            org = Organization(id="org-001", name="LATROCORE Diabetes Clinic", type="clinic")
            db.add(org)
            db.flush()

        now = datetime.now(timezone.utc)
        admin_id = None

        for cfg in SEEDED_STAFF_ACCOUNTS:
            user = db.query(User).filter(func.lower(User.email) == cfg["email"]).first()
            if not user:
                user = User(
                    id=cfg["id"],
                    email=cfg["email"],
                    name=cfg["name"],
                    phone=cfg["phone"],
                    password_hash=hash_password(cfg["password"]),
                    role=cfg["role"],
                    status="active",
                    verified=True,
                    org_id=org.id,
                )
                db.add(user)
                db.flush()
                print(f"[SEED] {cfg['role'].capitalize()} account ready: {cfg['email']} / {cfg['password']}")
            else:
                user.role = cfg["role"]
                user.status = "active"
                user.verified = True
                if not user.org_id:
                    user.org_id = org.id
                if not user.phone:
                    user.phone = cfg["phone"]
                if not verify_password(cfg["password"], user.password_hash):
                    user.password_hash = hash_password(cfg["password"])
                db.flush()
                print(f"[SEED] {cfg['role'].capitalize()} account verified: {cfg['email']}")

            if cfg["role"] == "admin":
                admin_id = user.id

            if "profile" in cfg:
                _ensure_staff_profile(db, user, cfg["profile"], admin_id, now)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed notice: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
