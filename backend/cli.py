"""
Secure CLI management commands for LATROCORE.
Provisions initial users with privately entered passwords (no console echo or history leakage).
"""

import sys
import getpass
import re
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.models import User, Organization


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    return True, ""


def create_user():
    print("=" * 60)
    print("  LATROCORE Secure User Provisioning CLI")
    print("=" * 60)
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    try:
        email = input("User Email: ").strip().lower()
        if not email or "@" not in email:
            print("Error: Valid email address is required.")
            sys.exit(1)
        
        # Check if already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Error: A user with email '{email}' already exists.")
            sys.exit(1)
            
        name = input("Full Name: ").strip()
        if not name:
            print("Error: Name cannot be empty.")
            sys.exit(1)
            
        role = input("Role (admin / doctor / care_team / patient) [admin]: ").strip().lower() or "admin"
        if role not in ["admin", "doctor", "care_team", "patient"]:
            print(f"Error: Invalid role '{role}'.")
            sys.exit(1)
            
        # Secure password entry: getpass suppresses terminal echoing
        password = getpass.getpass("Enter Password: ")
        is_strong, msg = validate_password_strength(password)
        if not is_strong:
            print(f"Error: {msg}")
            sys.exit(1)
            
        confirm_password = getpass.getpass("Confirm Password: ")
        if password != confirm_password:
            print("Error: Passwords do not match.")
            sys.exit(1)
            
        # Argon2id hashing
        print("\nComputing memory-hard Argon2id password hash...")
        hashed = hash_password(password)
        
        user = User(
            email=email,
            password_hash=hashed,
            name=name,
            role=role,
            status="active",
            verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print("\n" + "=" * 60)
        print(f"SUCCESS: User '{user.name}' ({user.email}) successfully provisioned!")
        print(f"User ID: {user.id}")
        print(f"Role:    {user.role}")
        print(f"Status:  {user.status}")
        print("=" * 60)
    finally:
        db.close()


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "create-user":
        create_user()
    else:
        print("Usage:")
        print("  python cli.py create-user   - Provision a user with a privately entered password")


if __name__ == "__main__":
    main()
