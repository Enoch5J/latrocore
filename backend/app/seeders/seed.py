"""
Clean system initialization for LATROCORE.
Ensures baseline organization and administrator account exist without dummy demo records.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.models import Organization, User


def seed():
    """Ensure baseline clinic organization and administrator account exist without dummy records."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # ── Organization ──
        org = db.query(Organization).first()
        if not org:
            org = Organization(id="org-001", name="LATROCORE Diabetes Clinic", type="clinic")
            db.add(org)
            db.flush()
        
        # ── Admin Account (Required for portal governance) ──
        admin = db.query(User).filter(User.email == "admin@latrocore.com").first()
        if not admin:
            admin = User(
                id="user-admin", email="admin@latrocore.com", name="System Admin",
                password_hash=hash_password("admin123"), role="admin",
                status="active", verified=True, org_id=org.id
            )
            db.add(admin)
            db.commit()
            print("[SEED] Admin account ready: admin@latrocore.com / admin123")
        else:
            db.commit()
            print("[SEED] Admin account already verified.")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed notice: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
