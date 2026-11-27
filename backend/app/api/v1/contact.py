"""Public contact enquiry submission and admin review endpoints."""

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.rate_limiter import get_or_create_attempt_record
from app.core.security import ensure_utc
from app.models.models import ContactEnquiry, User

router = APIRouter(prefix="/contact", tags=["Contact Enquiries"])

ALLOWED_CONTACT_TOPICS = (
    "Getting started",
    "Account support",
    "Using Latrocore",
    "Clinic or pharmacy enquiry",
    "Other",
)

EMAIL_REGEX = re.compile(
    r"^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+"
    r"(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@"
    r"(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$"
)
PHONE_REGEX = re.compile(r"^[0-9+\-\s().]{6,25}$")
CONTACT_MAX_SUBMISSIONS_PER_WINDOW = 10
CONTACT_WINDOW_MINUTES = 15


class ContactEnquiryCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., max_length=255)
    phone: Optional[str] = Field(default=None, max_length=30)
    topic: str = Field(..., max_length=80)
    message: str = Field(..., min_length=5, max_length=2000)
    # Hidden honeypot field for basic automated spam filtering
    website: Optional[str] = Field(default="")

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Please enter your full name (at least 2 characters).")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Please enter a valid email address.")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip()
        if not clean:
            return None
        if not PHONE_REGEX.match(clean):
            raise ValueError("Please enter a valid phone number or leave it blank.")
        return clean

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        clean = v.strip()
        if clean not in ALLOWED_CONTACT_TOPICS:
            raise ValueError("Please choose a valid enquiry topic.")
        return clean

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 5:
            raise ValueError("Please enter a short message (at least 5 characters).")
        return clean


def _enforce_contact_rate_limit(db: Session, client_ip: str) -> None:
    """Apply per-IP rate limiting using the shared RateLimitAttempt table."""
    now = datetime.now(timezone.utc)
    window = timedelta(minutes=CONTACT_WINDOW_MINUTES)
    key = f"contact:{client_ip}"
    record = get_or_create_attempt_record(db, key)
    first_attempt = ensure_utc(record.first_attempt_at)

    if record.locked_until:
        locked_until = ensure_utc(record.locked_until)
        if locked_until > now:
            retry_after = max(1, int((locked_until - now).total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many enquiries sent recently. Please try again shortly.",
                headers={"Retry-After": str(retry_after)},
            )

    if now - first_attempt > window:
        record.attempts = 1
        record.first_attempt_at = now
        record.locked_until = None
    else:
        record.attempts += 1
        if record.attempts > CONTACT_MAX_SUBMISSIONS_PER_WINDOW:
            record.locked_until = now + window
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many enquiries sent recently. Please try again shortly.",
                headers={"Retry-After": str(int(window.total_seconds()))},
            )


@router.post("/enquiries", status_code=status.HTTP_201_CREATED)
def submit_contact_enquiry(
    payload: ContactEnquiryCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Receive and store a public contact enquiry from signed-out visitors or users."""
    if payload.website and payload.website.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to process submission.",
        )

    client_ip = request.client.host if request.client else "unknown"
    _enforce_contact_rate_limit(db, client_ip)

    enquiry = ContactEnquiry(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        topic=payload.topic,
        message=payload.message,
        status="new",
        ip_address=client_ip,
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)

    return {
        "id": enquiry.id,
        "status": "received",
        "message": "Thank you. Your message has been received.",
        "created_at": enquiry.created_at.isoformat() if enquiry.created_at else None,
    }


@router.get("/enquiries")
def list_contact_enquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Allow authorized administrators to review received public enquiries."""
    rows = db.query(ContactEnquiry).order_by(ContactEnquiry.created_at.desc()).all()
    return {
        "enquiries": [
            {
                "id": r.id,
                "full_name": r.full_name,
                "email": r.email,
                "phone": r.phone,
                "topic": r.topic,
                "message": r.message,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }
