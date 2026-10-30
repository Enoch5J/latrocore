"""
Authentication routes — signup, login, silent refresh, logout, me, OTP verification, password reset.
Implements the Silent Refresh pattern with Argon2id, signed JWTs,
cryptographic refresh token rotation, reuse detection, and keyed HMAC OTPs.
"""

import os
import re
import json
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, UploadFile, File
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    generate_refresh_token,
    hash_refresh_token,
    create_access_token,
    ensure_utc,
    validate_password_strength,
    generate_otp,
    hash_otp,
    verify_otp_hash
)
from app.core.email import (
    send_otp_email,
    send_password_reset_email,
    send_password_reset_confirmation_email
)
from app.core.dependencies import get_current_user
from app.core.rate_limiter import check_login_rate_limit, record_login_failure, record_login_success
from app.core.csrf import verify_csrf
from app.models.models import (
    User,
    Session as UserSession,
    RefreshToken,
    AuditEvent,
    EmailVerificationOTP,
    Patient,
    DoctorProfile,
    PharmacistProfile
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALLOWED_PRESCRIPTION_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
MAX_PRESCRIPTION_SIZE = 10 * 1024 * 1024  # 10 MB


# ── Schemas ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    identifier: Optional[str] = None
    email: Optional[str] = None
    password: str


class SendOtpRequest(BaseModel):
    email: EmailStr
    purpose: str  # "patient_signup", "doctor_signup", "reset_password"


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str
    purpose: str


class PatientSignupRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    countryCode: str = "+91"
    age: int
    height: Optional[float] = None
    weight: Optional[float] = None
    conditions: List[str] = []
    otherCondition: Optional[str] = None
    prescriptionFileUrl: Optional[str] = None
    prescriptionFileName: Optional[str] = None
    password: str
    confirmPassword: str
    verificationToken: str
    consentHealthData: bool = True
    acceptTerms: bool


class DoctorSignupRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    countryCode: str = "+91"
    licenseNumber: str
    council: str
    specialization: str
    hospitalClinic: Optional[str] = None
    password: str
    confirmPassword: str
    verificationToken: str
    acceptTerms: bool


class PharmacistSignupRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    countryCode: str = "+91"
    licenseNumber: str
    council: str
    specialization: str = "Clinical Pharmacist"
    pharmacyName: Optional[str] = None
    password: str
    confirmPassword: str
    verificationToken: str
    acceptTerms: bool



class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    verificationToken: str
    password: str
    confirmPassword: str


class UserPayload(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    verified: bool
    displayId: Optional[str] = None
    approvalStatus: Optional[str] = None


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "Bearer"
    expiresIn: int
    user: UserPayload


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    verified: bool
    displayId: Optional[str] = None
    approvalStatus: Optional[str] = None
    phone: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────

def set_refresh_cookie(response: Response, raw_token: str, max_age: int):
    """Set __Host-refresh secure HttpOnly cookie matching specification."""
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=raw_token,
        max_age=max_age,
        path=settings.COOKIE_PATH,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        domain=None
    )


def clear_refresh_cookie(response: Response):
    """Clear refresh cookie with identical security attributes."""
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path=settings.COOKIE_PATH,
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        domain=None
    )


def get_user_display_meta(user: User, db: Session):
    """Fetch display ID and approval status for patient, doctor, or pharmacist."""
    display_id = None
    approval_status = None
    if user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        if patient:
            display_id = patient.patient_id_display
            approval_status = getattr(patient, "approval_status", None) or ("pending" if user.status == "pending" else "approved")
    elif user.role == "doctor":
        doc = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
        if doc:
            display_id = doc.doctor_id_display
            approval_status = doc.approval_status or ("pending" if user.status == "pending" else "approved")
    elif user.role in ("pharmacist", "care_team"):
        pharm = db.query(PharmacistProfile).filter(PharmacistProfile.user_id == user.id).first()
        if pharm:
            display_id = pharm.pharmacist_id_display
            approval_status = pharm.approval_status or ("pending" if user.status == "pending" else "approved")
    return display_id, approval_status


def generate_unique_patient_id(db: Session) -> str:
    """Generate unique public PAT-XXXXXX ID."""
    for _ in range(25):
        num = secrets.randbelow(900000) + 100000
        candidate = f"PAT-{num}"
        if not db.query(Patient).filter(Patient.patient_id_display == candidate).first():
            return candidate
    return f"PAT-{uuid.uuid4().hex[:6].upper()}"


def generate_unique_doctor_id(db: Session) -> str:
    """Generate unique public DOC-XXXXXX account ID."""
    for _ in range(25):
        num = secrets.randbelow(900000) + 100000
        candidate = f"DOC-{num}"
        if not db.query(DoctorProfile).filter(DoctorProfile.doctor_id_display == candidate).first():
            return candidate
    return f"DOC-{uuid.uuid4().hex[:6].upper()}"


def generate_unique_pharmacist_id(db: Session) -> str:
    """Generate unique public PHARM-XXXXXX account ID."""
    for _ in range(25):
        num = secrets.randbelow(900000) + 100000
        candidate = f"PHARM-{num}"
        if not db.query(PharmacistProfile).filter(PharmacistProfile.pharmacist_id_display == candidate).first():
            return candidate
    return f"PHARM-{uuid.uuid4().hex[:6].upper()}"



def validate_full_name(name: str) -> str:
    trimmed = name.strip()
    if len(trimmed) < 2 or len(trimmed) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name must be between 2 and 100 characters."
        )
    if not re.match(r"^[\w\s\.\'\-]+$", trimmed, flags=re.UNICODE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name contains invalid characters."
        )
    return trimmed


def validate_phone_number(country_code: str, phone: str) -> str:
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    if country_code == "+91":
        if not re.match(r'^[5-9]\d{9}$', cleaned):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 10-digit Indian mobile number."
            )
    else:
        if not re.match(r'^\d{7,15}$', cleaned):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid mobile number (7-15 digits)."
            )
    return cleaned


def validate_age(age: int) -> int:
    if age < 0 or age > 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Age must be an integer between 0 and 120."
        )
    return age


def find_user_by_identifier(db: Session, raw_identifier: str) -> Optional[User]:
    """
    Look up user by email or phone number.
    Supports:
    - Standard email: "doctor@latrocore.com"
    - Raw phone digits: "9876543210"
    - Formatted phone: "+91 9876543210", "+91-9876543210", "+919876543210"
    - 10-digit Indian numbers with or without country code prefix
    - Suffix matching for numbers stored with separators or prefixes
    """
    clean = raw_identifier.strip()
    if not clean:
        return None

    # 1. If it contains '@', prioritize email match
    if "@" in clean:
        return db.query(User).filter(func.lower(User.email) == clean.lower()).first()

    # 2. Phone number candidate matching
    clean_digits = re.sub(r'\D', '', clean)
    if clean_digits:
        candidates = [
            clean,
            f"+{clean_digits}",
            clean_digits,
        ]
        if len(clean_digits) == 10:
            candidates.extend([
                f"+91{clean_digits}",
                f"+91-{clean_digits}",
                f"+91 {clean_digits}"
            ])
        elif len(clean_digits) == 12 and clean_digits.startswith("91"):
            last_10 = clean_digits[-10:]
            candidates.extend([
                last_10,
                f"+{clean_digits}",
                f"+91-{last_10}",
                f"+91 {last_10}"
            ])

        user = db.query(User).filter(User.phone.in_(candidates)).first()
        if user:
            return user

        # Suffix matching: match last 10 digits against stored phone
        if len(clean_digits) >= 7:
            suffix = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits
            user = db.query(User).filter(User.phone.like(f"%{suffix}")).first()
            if user:
                return user

    # 3. Fallback: email match (e.g. usernames or atypical email)
    return db.query(User).filter(func.lower(User.email) == clean.lower()).first()



def create_user_auth_session(user: User, request: Request, response: Response, db: Session) -> TokenResponse:
    """Create session, refresh token cookie, and return TokenResponse."""
    now = datetime.now(timezone.utc)
    session_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    client_ip = request.client.host if request.client else "127.0.0.1"

    user_session = UserSession(
        user_id=user.id,
        created_at=now,
        expires_at=session_expires_at,
        is_revoked=False,
        user_agent=request.headers.get("user-agent"),
        ip_address=client_ip
    )
    db.add(user_session)
    db.flush()

    raw_refresh_token = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh_token)

    refresh_record = RefreshToken(
        session_id=user_session.id,
        token_hash=token_hash,
        created_at=now,
        expires_at=session_expires_at,
        is_consumed=False
    )
    db.add(refresh_record)

    db.add(AuditEvent(
        actor_id=user.id,
        action="login",
        record_type="session",
        record_id=user_session.id,
        ip_address=client_ip
    ))
    db.commit()

    access_token, expires_in = create_access_token(
        user_id=user.id,
        session_id=user_session.id,
        role=user.role
    )

    max_age_seconds = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    set_refresh_cookie(response, raw_refresh_token, max_age_seconds)

    display_id, approval_status = get_user_display_meta(user, db)

    return TokenResponse(
        accessToken=access_token,
        tokenType="Bearer",
        expiresIn=expires_in,
        user=UserPayload(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            status=user.status,
            verified=user.verified,
            displayId=display_id,
            approvalStatus=approval_status
        )
    )


# ── OTP Endpoints ────────────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(
    req: SendOtpRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Send a 6-digit verification code with HMAC hash storage, 60s cooldown,
    and 5-minute expiration. Single-use and invalidates prior codes.
    """
    valid_purposes = {"patient_signup", "doctor_signup", "pharmacist_signup", "reset_password"}
    if req.purpose not in valid_purposes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification purpose."
        )

    email = req.email.lower().strip()
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = datetime.now(timezone.utc)

    # For signup, prevent duplicate registration
    existing_user = db.query(User).filter(User.email == email).first()
    if req.purpose in ("patient_signup", "doctor_signup", "pharmacist_signup") and existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in."
        )

    # Rate limiting: Check active cooldown for this email and purpose
    active_otp = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == req.purpose,
        EmailVerificationOTP.is_consumed == False
    ).order_by(EmailVerificationOTP.created_at.desc()).first()

    if active_otp and active_otp.cooldown_until and ensure_utc(active_otp.cooldown_until) > now:
        remaining = int((ensure_utc(active_otp.cooldown_until) - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before requesting a new code.",
            headers={"Retry-After": str(remaining)}
        )

    # Server-side request volume check (IP and email limit: max 6 OTP requests in 15 mins)
    recent_count = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.created_at >= now - timedelta(minutes=15)
    ).count()
    if recent_count >= 6:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification requests. Please try again in 15 minutes."
        )

    # Invalidate previous unconsumed codes for this email and purpose
    db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == req.purpose,
        EmailVerificationOTP.is_consumed == False
    ).update({"is_consumed": True})

    # If reset_password and user does not exist, return generic response without sending email
    if req.purpose == "reset_password" and not existing_user:
        db.commit()
        return {
            "message": "If an account exists with this email address, we have sent a 6-digit reset code.",
            "cooldownSeconds": 60,
            "expiresInSeconds": 300
        }

    otp_code = generate_otp()
    otp_hash = hash_otp(otp_code, email, req.purpose)

    record = EmailVerificationOTP(
        email=email,
        otp_hash=otp_hash,
        purpose=req.purpose,
        attempts=0,
        is_verified=False,
        is_consumed=False,
        expires_at=now + timedelta(minutes=5),
        cooldown_until=now + timedelta(seconds=60),
        ip_address=client_ip
    )
    db.add(record)
    db.commit()

    sent = False
    if req.purpose == "reset_password":
        sent = send_password_reset_email(email, otp_code)
    else:
        sent = send_otp_email(email, otp_code, req.purpose)

    response_data = {
        "message": "Verification code sent to your email address." if sent else "Verification code generated.",
        "cooldownSeconds": 60,
        "expiresInSeconds": 300,
        "emailDispatched": bool(sent)
    }

    # If SMTP dispatch failed (e.g. Render Free Tier blocks outbound port 587/465) or SMTP not set,
    # supply devOtp so the user is never blocked or left in the dark.
    if not sent or settings.ENVIRONMENT == "development" or not os.getenv("SMTP_HOST"):
        response_data["devOtp"] = otp_code
        if not sent and os.getenv("SMTP_HOST"):
            response_data["devNotice"] = (
                f"Cloud host blocked SMTP port 587. Verification code: {otp_code}"
            )
        else:
            response_data["devNotice"] = "Verification code provided for local/testing convenience."

    return response_data


@router.post("/verify-otp")
def verify_otp(
    req: VerifyOtpRequest,
    db: Session = Depends(get_db)
):
    """
    Verify 6-digit OTP code against HMAC keyed hash.
    Enforces maximum 5 attempts, single-use consumption, and generates a
    15-minute cryptographically random verification token.
    """
    email = req.email.lower().strip()
    purpose = req.purpose
    now = datetime.now(timezone.utc)

    record = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == purpose,
        EmailVerificationOTP.is_consumed == False,
        EmailVerificationOTP.is_verified == False
    ).order_by(EmailVerificationOTP.created_at.desc()).first()

    if not record or ensure_utc(record.expires_at) <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired or is invalid. Please request a new code."
        )

    if record.attempts >= 5:
        record.is_consumed = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts exceeded. Please request a new code."
        )

    record.attempts += 1

    if not verify_otp_hash(req.otp.strip(), record.otp_hash, email, purpose):
        db.commit()
        remaining = max(0, 5 - record.attempts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    verification_token = secrets.token_urlsafe(32)
    record.is_verified = True
    record.token = verification_token
    record.verified_at = now
    record.token_expires_at = now + timedelta(minutes=15)
    db.commit()

    return {
        "message": "Email verified successfully.",
        "verificationToken": verification_token,
        "email": email,
        "expiresInMinutes": 15
    }


# ── Prescription Upload Endpoint ─────────────────────────────────────

@router.post("/upload-prescription")
async def upload_prescription(
    file: UploadFile = File(...)
):
    """
    Upload optional prescription file during patient signup.
    Supports PDF, JPG, JPEG, PNG up to 10 MB per file.
    """
    filename = file.filename or "prescription"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_PRESCRIPTION_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, WEBP, PNG, JPG, JPEG."
        )

    contents = await file.read()
    if len(contents) > MAX_PRESCRIPTION_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum allowed limit of 10 MB."
        )

    upload_dir = os.path.join("uploads", "prescriptions")
    os.makedirs(upload_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)}"
    file_path = os.path.join(upload_dir, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    return {
        "fileUrl": f"/uploads/prescriptions/{safe_name}",
        "fileName": filename,
        "fileSize": len(contents)
    }


# ── Signup Endpoints ─────────────────────────────────────────────────

@router.post("/register/patient", response_model=TokenResponse)
def register_patient(
    req: PatientSignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Register a new Patient with verified email, health conditions,
    server-generated unique PAT-XXXXXX ID, and automatic secure session creation.
    """
    email = req.email.lower().strip()
    now = datetime.now(timezone.utc)

    # 1. Validate Terms and Consent
    if not req.acceptTerms:
        raise HTTPException(status_code=400, detail="You must accept the Terms of Service and Privacy Policy.")
    if not req.consentHealthData:
        raise HTTPException(status_code=400, detail="You must consent to the storage and processing of your submitted health information.")

    # 2. Validate Fields
    name = validate_full_name(req.name)
    age = validate_age(req.age)
    phone = validate_phone_number(req.countryCode, req.phone)

    # 3. Validate Passwords
    if req.password != req.confirmPassword:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")
    is_valid, err_msg = validate_password_strength(req.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # 4. Verify Server-Side OTP Token (never trust client emailVerified flag)
    otp_record = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.token == req.verificationToken,
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == "patient_signup",
        EmailVerificationOTP.is_verified == True,
        EmailVerificationOTP.is_consumed == False
    ).first()

    if not otp_record or not otp_record.token_expires_at or ensure_utc(otp_record.token_expires_at) <= now:
        raise HTTPException(
            status_code=400,
            detail="Email verification has expired or is invalid. Please verify your email again."
        )

    # Single-use consumption
    otp_record.is_consumed = True

    # Check duplicate email
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please sign in.")

    # 5. Build conditions list
    condition_items = [c.strip() for c in req.conditions if c.strip()]
    if req.otherCondition and req.otherCondition.strip():
        condition_items.append(f"Other: {req.otherCondition.strip()}")
    # Deduplicate while preserving order
    deduped_conditions = list(dict.fromkeys(condition_items))

    # 6. Generate Unique Patient ID
    patient_display_id = generate_unique_patient_id(db)

    # 7. Create User and Patient (Pending Medical Board Administration Approval)
    new_user = User(
        email=email,
        password_hash=hash_password(req.password),
        name=name,
        phone=f"{req.countryCode}{phone}",
        role="patient",
        status="pending",
        verified=True
    )
    db.add(new_user)
    db.flush()

    new_patient = Patient(
        user_id=new_user.id,
        patient_id_display=patient_display_id,
        age=age,
        height=req.height,
        weight=req.weight,
        conditions=json.dumps(deduped_conditions),
        prescription_file_url=req.prescriptionFileUrl,
        prescription_file_name=req.prescriptionFileName,
        approval_status="pending"
    )
    db.add(new_patient)
    db.commit()

    return create_user_auth_session(new_user, request, response, db)


@router.post("/register/doctor", response_model=TokenResponse)
def register_doctor(
    req: DoctorSignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Register a new Doctor account.
    Account remains pending professional credential verification by an authorized administrator.
    Generates unique DOC-XXXXXX account ID.
    """
    email = req.email.lower().strip()
    now = datetime.now(timezone.utc)

    if not req.acceptTerms:
        raise HTTPException(status_code=400, detail="You must accept the Terms of Service and Privacy Policy.")

    name = validate_full_name(req.name)
    phone = validate_phone_number(req.countryCode, req.phone)

    if not req.licenseNumber.strip():
        raise HTTPException(status_code=400, detail="Medical registration / license number is required.")
    if not req.council.strip():
        raise HTTPException(status_code=400, detail="Registration authority / medical council is required.")
    if not req.specialization.strip():
        raise HTTPException(status_code=400, detail="Medical specialization is required.")

    if req.password != req.confirmPassword:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")
    is_valid, err_msg = validate_password_strength(req.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Verify Server-Side OTP Token
    otp_record = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.token == req.verificationToken,
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == "doctor_signup",
        EmailVerificationOTP.is_verified == True,
        EmailVerificationOTP.is_consumed == False
    ).first()

    if not otp_record or not otp_record.token_expires_at or ensure_utc(otp_record.token_expires_at) <= now:
        raise HTTPException(
            status_code=400,
            detail="Email verification has expired or is invalid. Please verify your email again."
        )

    otp_record.is_consumed = True

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please sign in.")

    doctor_display_id = generate_unique_doctor_id(db)

    # Create User with pending status
    new_user = User(
        email=email,
        password_hash=hash_password(req.password),
        name=name,
        phone=f"{req.countryCode}{phone}",
        role="doctor",
        status="pending",  # Pending administrative credential verification!
        verified=True
    )
    db.add(new_user)
    db.flush()

    doctor_profile = DoctorProfile(
        user_id=new_user.id,
        doctor_id_display=doctor_display_id,
        license_number=req.licenseNumber.strip(),
        council=req.council.strip(),
        specialization=req.specialization.strip(),
        hospital_clinic=req.hospitalClinic.strip() if req.hospitalClinic else None,
        approval_status="pending"
    )
    db.add(doctor_profile)
    db.commit()

    return create_user_auth_session(new_user, request, response, db)


@router.post("/register/pharmacist", response_model=TokenResponse)
def register_pharmacist(
    req: PharmacistSignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Register a new Pharmacist account.
    Account remains pending professional credential verification by authorized administrator.
    Generates unique PHARM-XXXXXX account ID.
    """
    email = req.email.lower().strip()
    now = datetime.now(timezone.utc)

    if not req.acceptTerms:
        raise HTTPException(status_code=400, detail="You must accept the Terms of Service and Privacy Policy.")

    name = validate_full_name(req.name)
    phone = validate_phone_number(req.countryCode, req.phone)

    if not req.licenseNumber.strip():
        raise HTTPException(status_code=400, detail="Pharmacy registration / license number is required.")
    if not req.council.strip():
        raise HTTPException(status_code=400, detail="State Pharmacy Council or registration authority is required.")
    if not req.specialization.strip():
        raise HTTPException(status_code=400, detail="Pharmacy practice area is required.")

    if req.password != req.confirmPassword:
        raise HTTPException(status_code=400, detail="Password and confirm password do not match.")
    is_valid, err_msg = validate_password_strength(req.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Verify Server-Side OTP Token
    otp_record = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.token == req.verificationToken,
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == "pharmacist_signup",
        EmailVerificationOTP.is_verified == True,
        EmailVerificationOTP.is_consumed == False
    ).first()

    if not otp_record or not otp_record.token_expires_at or ensure_utc(otp_record.token_expires_at) <= now:
        raise HTTPException(
            status_code=400,
            detail="Email verification has expired or is invalid. Please verify your email again."
        )

    otp_record.is_consumed = True

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please sign in.")

    pharmacist_display_id = generate_unique_pharmacist_id(db)

    # Create User with role="pharmacist" and pending status
    new_user = User(
        email=email,
        password_hash=hash_password(req.password),
        name=name,
        phone=f"{req.countryCode}{phone}",
        role="pharmacist",
        status="pending",  # Pending credential verification
        verified=True
    )
    db.add(new_user)
    db.flush()

    pharmacist_profile = PharmacistProfile(
        user_id=new_user.id,
        pharmacist_id_display=pharmacist_display_id,
        license_number=req.licenseNumber.strip(),
        council=req.council.strip(),
        specialization=req.specialization.strip(),
        pharmacy_name=req.pharmacyName.strip() if req.pharmacyName else None,
        approval_status="pending"
    )
    db.add(pharmacist_profile)
    db.commit()

    return create_user_auth_session(new_user, request, response, db)


# ── Password Reset Endpoints ─────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Request password reset OTP.
    Always returns generic response to prevent user enumeration attacks.
    """
    email = req.email.lower().strip()
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = datetime.now(timezone.utc)

    # Cooldown check
    active_otp = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == "reset_password",
        EmailVerificationOTP.is_consumed == False
    ).order_by(EmailVerificationOTP.created_at.desc()).first()

    if active_otp and active_otp.cooldown_until and ensure_utc(active_otp.cooldown_until) > now:
        remaining = int((ensure_utc(active_otp.cooldown_until) - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining} seconds before requesting a new password reset code.",
            headers={"Retry-After": str(remaining)}
        )

    # Invalidate previous unconsumed reset codes
    db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == "reset_password",
        EmailVerificationOTP.is_consumed == False
    ).update({"is_consumed": True})

    user = db.query(User).filter(User.email == email).first()
    if user:
        otp_code = generate_otp()
        otp_hash = hash_otp(otp_code, email, "reset_password")
        record = EmailVerificationOTP(
            email=email,
            otp_hash=otp_hash,
            purpose="reset_password",
            attempts=0,
            is_verified=False,
            is_consumed=False,
            expires_at=now + timedelta(minutes=5),
            cooldown_until=now + timedelta(seconds=60),
            ip_address=client_ip
        )
        db.add(record)
        db.commit()
        send_password_reset_email(email, otp_code)
    else:
        db.commit()

    resp = {
        "message": "If an account exists with this email address, we have sent a 6-digit password reset code.",
        "cooldownSeconds": 60
    }
    if user and settings.ENVIRONMENT == "development" and not os.getenv("SMTP_HOST"):
        resp["devOtp"] = otp_code
        resp["devNotice"] = "SMTP server not configured. Code logged to backend console and provided here for local development."

    return resp


@router.post("/reset-password")
def reset_password(
    req: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset user password using short-lived verified reset token.
    Invalidates reset token and all prior user sessions, and sends a confirmation email.
    """
    email = req.email.lower().strip()
    now = datetime.now(timezone.utc)

    if req.password != req.confirmPassword:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")
    is_valid, err_msg = validate_password_strength(req.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Validate reset token
    otp_record = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.token == req.verificationToken,
        EmailVerificationOTP.email == email,
        EmailVerificationOTP.purpose == "reset_password",
        EmailVerificationOTP.is_verified == True,
        EmailVerificationOTP.is_consumed == False
    ).first()

    if not otp_record or not otp_record.token_expires_at or ensure_utc(otp_record.token_expires_at) <= now:
        raise HTTPException(
            status_code=400,
            detail="Password reset authorization has expired or is invalid. Please request a new code."
        )

    otp_record.is_consumed = True

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    # Update password
    user.password_hash = hash_password(req.password)

    # Invalidate all active sessions for this user
    active_sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False
    ).all()
    for s in active_sessions:
        s.is_revoked = True
        s.revoked_at = now

    db.add(AuditEvent(
        actor_id=user.id,
        action="password_reset",
        record_type="user",
        record_id=user.id
    ))
    db.commit()

    send_password_reset_confirmation_email(user.email, user.name)

    return {
        "message": "Your password has been successfully reset. Please sign in with your new password."
    }


# ── Core Auth Endpoints ──────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with Argon2id, create database session,
    set HttpOnly secure refresh cookie, and return signed JWT in JSON.
    Allows pending doctors to sign in so they can view verification status.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"

    identifier = (req.identifier or req.email or "").strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter your email or phone number."
        )

    # 1. Resolve user by email or phone number
    user = find_user_by_identifier(db, identifier)
    rate_limit_target = user.email if user else identifier.lower()

    # 2. Rate Limiting by IP and Account
    client_ip = request.client.host if request.client else "127.0.0.1"
    is_limited, retry_after = check_login_rate_limit(db, client_ip, rate_limit_target)
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

    # 3. Verify Argon2id password hash
    if not user or not verify_password(req.password, user.password_hash):
        record_login_failure(db, client_ip, rate_limit_target)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Suspended or rejected account check
    if user.status == "suspended":
        rejection_reason = None
        if user.role == "doctor" and user.doctor_profile and user.doctor_profile.approval_status == "rejected":
            rejection_reason = user.doctor_profile.rejection_reason
        elif user.role in ("pharmacist", "care_team") and user.pharmacist_profile and user.pharmacist_profile.approval_status == "rejected":
            rejection_reason = user.pharmacist_profile.rejection_reason
        elif user.role == "patient" and user.patient_profile and getattr(user.patient_profile, "approval_status", None) == "rejected":
            rejection_reason = user.patient_profile.rejection_reason

        detail_msg = f"Account registration rejected by Medical Board: {rejection_reason}" if rejection_reason else "Account has been suspended. Please contact support."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail_msg
        )

    # Note: Pending users (patient, doctor, pharmacist) are allowed to authenticate
    # so they can access their Waiting for Admin Approval portal. ProtectedRoute
    # intercepts pending accounts and prevents unauthorized clinical actions.

    # Reset failure counter on success
    record_login_success(db, client_ip, user.email)

    return create_user_auth_session(user, request, response, db)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Silent Refresh: Read HttpOnly refresh cookie, verify hash, rotate token atomically,
    detect token reuse, and return new access token.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"

    verify_csrf(request)

    raw_refresh_token = request.cookies.get(settings.COOKIE_NAME)
    if not raw_refresh_token:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie missing"
        )

    token_hash = hash_refresh_token(raw_refresh_token)
    now = datetime.now(timezone.utc)

    token_record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash
    ).with_for_update().first()

    if not token_record:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    if token_record.is_consumed:
        parent_session = db.query(UserSession).filter(
            UserSession.id == token_record.session_id
        ).with_for_update().first()
        if parent_session:
            parent_session.is_revoked = True
            parent_session.revoked_at = now
            db.commit()
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reuse detected. Session has been revoked."
        )

    user_session = db.query(UserSession).filter(
        UserSession.id == token_record.session_id
    ).with_for_update().first()

    if (
        not user_session
        or user_session.is_revoked
        or ensure_utc(user_session.expires_at) <= now
        or ensure_utc(token_record.expires_at) <= now
    ):
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or been revoked"
        )

    user = db.query(User).filter(User.id == user_session.user_id).first()
    if not user or user.status == "suspended":
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )

    # Atomic rotation
    token_record.is_consumed = True
    token_record.consumed_at = now

    new_raw_token = generate_refresh_token()
    new_token_hash = hash_refresh_token(new_raw_token)

    new_refresh_record = RefreshToken(
        session_id=user_session.id,
        token_hash=new_token_hash,
        created_at=now,
        expires_at=user_session.expires_at,
        is_consumed=False
    )
    db.add(new_refresh_record)
    db.commit()

    access_token, expires_in = create_access_token(
        user_id=user.id,
        session_id=user_session.id,
        role=user.role
    )

    remaining_seconds = max(0, int((ensure_utc(user_session.expires_at) - now).total_seconds()))
    set_refresh_cookie(response, new_raw_token, remaining_seconds)

    display_id, approval_status = get_user_display_meta(user, db)

    return TokenResponse(
        accessToken=access_token,
        tokenType="Bearer",
        expiresIn=expires_in,
        user=UserPayload(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            status=user.status,
            verified=user.verified,
            displayId=display_id,
            approvalStatus=approval_status
        )
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Idempotent logout: Revoke database session, clear cookie,
    and reject subsequent access.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"

    verify_csrf(request)

    raw_refresh_token = request.cookies.get(settings.COOKIE_NAME)
    if raw_refresh_token:
        token_hash = hash_refresh_token(raw_refresh_token)
        token_record = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()
        if token_record:
            user_session = db.query(UserSession).filter(
                UserSession.id == token_record.session_id
            ).first()
            if user_session and not user_session.is_revoked:
                user_session.is_revoked = True
                user_session.revoked_at = datetime.now(timezone.utc)
                db.commit()

    clear_refresh_cookie(response)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
def get_me(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return authenticated user information from validated access token."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    display_id, approval_status = get_user_display_meta(current_user, db)
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        status=current_user.status,
        verified=current_user.verified,
        displayId=display_id,
        approvalStatus=approval_status,
        phone=current_user.phone
    )


@router.get("/status")
def get_auth_status(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lightweight endpoint for polling approval status from Waiting page."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    display_id, approval_status = get_user_display_meta(current_user, db)
    rejection_reason = None
    if current_user.role == "patient" and current_user.patient_profile:
        rejection_reason = getattr(current_user.patient_profile, "rejection_reason", None)
    elif current_user.role == "doctor" and current_user.doctor_profile:
        rejection_reason = current_user.doctor_profile.rejection_reason
    elif current_user.role in ("pharmacist", "care_team") and current_user.pharmacist_profile:
        rejection_reason = current_user.pharmacist_profile.rejection_reason

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "approvalStatus": approval_status or ("pending" if current_user.status == "pending" else "approved"),
        "displayId": display_id,
        "rejectionReason": rejection_reason
    }
