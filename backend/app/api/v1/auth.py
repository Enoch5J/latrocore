"""Auth routes — register, login, logout, me."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.models import User, Patient, Organization, AuditEvent

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "patient"
    phone: str | None = None
    org_id: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    verified: bool
    phone: str | None = None
    org_id: str | None = None
    patient_id: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check duplicate email
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        name=req.name,
        role=req.role,
        phone=req.phone,
        org_id=req.org_id,
        verified=req.role == "patient",  # Staff need verification
        status="active" if req.role == "patient" else "pending"
    )
    db.add(user)
    db.flush()
    
    patient_id = None
    # Auto-create patient profile for patient role
    if req.role == "patient":
        patient = Patient(user_id=user.id)
        db.add(patient)
        db.flush()
        patient_id = patient.id
    
    # Audit
    db.add(AuditEvent(actor_id=user.id, action="register", record_type="user", record_id=user.id))
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id, "email": user.email, "name": user.name,
            "role": user.role, "status": user.status, "verified": user.verified,
            "phone": user.phone, "org_id": user.org_id, "patient_id": patient_id
        }
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.status == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended")
    
    # Get patient_id if applicable
    patient_id = None
    if user.role == "patient" and user.patient_profile:
        patient_id = user.patient_profile.id
    
    db.add(AuditEvent(actor_id=user.id, action="login", record_type="user", record_id=user.id))
    db.commit()
    
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id, "email": user.email, "name": user.name,
            "role": user.role, "status": user.status, "verified": user.verified,
            "phone": user.phone, "org_id": user.org_id, "patient_id": patient_id
        }
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.add(AuditEvent(actor_id=current_user.id, action="logout", record_type="user", record_id=current_user.id))
    db.commit()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_id = None
    if current_user.role == "patient" and current_user.patient_profile:
        patient_id = current_user.patient_profile.id
    return UserOut(
        id=current_user.id, email=current_user.email, name=current_user.name,
        role=current_user.role, status=current_user.status, verified=current_user.verified,
        phone=current_user.phone, org_id=current_user.org_id, patient_id=patient_id
    )
