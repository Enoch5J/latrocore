"""
Admin routes — management of pending doctor approvals and clinical verifications.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.email import send_doctor_approval_notification
from app.models.models import User, DoctorProfile, AuditEvent

router = APIRouter(prefix="/admin", tags=["Admin"])


class PendingDoctorOut(BaseModel):
    id: str
    userId: str
    name: str
    email: str
    phone: Optional[str] = None
    doctorIdDisplay: str
    licenseNumber: str
    council: str
    specialization: str
    hospitalClinic: Optional[str] = None
    approvalStatus: str
    createdAt: datetime


class RejectionRequest(BaseModel):
    reason: str


@router.get("/doctors/pending", response_model=List[PendingDoctorOut])
def get_pending_doctors(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """List all doctors pending credential verification."""
    profiles = db.query(DoctorProfile).filter(
        DoctorProfile.approval_status == "pending"
    ).order_by(DoctorProfile.created_at.desc()).all()
    
    results = []
    for doc in profiles:
        user = db.query(User).filter(User.id == doc.user_id).first()
        if user:
            results.append(PendingDoctorOut(
                id=doc.id,
                userId=user.id,
                name=user.name,
                email=user.email,
                phone=user.phone,
                doctorIdDisplay=doc.doctor_id_display,
                licenseNumber=doc.license_number,
                council=doc.council,
                specialization=doc.specialization,
                hospitalClinic=doc.hospital_clinic,
                approvalStatus=doc.approval_status,
                createdAt=doc.created_at
            ))
    return results


@router.post("/doctors/{profile_id}/approve")
def approve_doctor(
    profile_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Approve a doctor's medical credentials and grant clinical access."""
    doc = db.query(DoctorProfile).filter(DoctorProfile.id == profile_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    user = db.query(User).filter(User.id == doc.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Doctor user account not found")
    
    now = datetime.now(timezone.utc)
    doc.approval_status = "approved"
    doc.approved_by = admin_user.id
    doc.approved_at = now
    
    user.status = "active"
    
    db.add(AuditEvent(
        actor_id=admin_user.id,
        action="approve_doctor",
        record_type="doctor_profile",
        record_id=doc.id
    ))
    db.commit()
    
    send_doctor_approval_notification(user.email, user.name, "approved")
    
    return {
        "message": f"Doctor {user.name} ({doc.doctor_id_display}) approved successfully",
        "doctorId": doc.id,
        "status": "approved"
    }


@router.post("/doctors/{profile_id}/reject")
def reject_doctor(
    profile_id: str,
    req: RejectionRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Reject a doctor's credentials with specified reason."""
    doc = db.query(DoctorProfile).filter(DoctorProfile.id == profile_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    user = db.query(User).filter(User.id == doc.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Doctor user account not found")
    
    now = datetime.now(timezone.utc)
    doc.approval_status = "rejected"
    doc.rejection_reason = req.reason.strip()
    
    user.status = "suspended"
    
    db.add(AuditEvent(
        actor_id=admin_user.id,
        action="reject_doctor",
        record_type="doctor_profile",
        record_id=doc.id
    ))
    db.commit()
    
    send_doctor_approval_notification(user.email, user.name, "rejected", req.reason.strip())
    
    return {
        "message": f"Doctor {user.name} credentials rejected",
        "doctorId": doc.id,
        "status": "rejected"
    }
