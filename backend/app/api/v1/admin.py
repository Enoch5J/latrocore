"""
Admin routes — management of pending doctor, pharmacist, and patient approvals,
credential verification, and platform user administration.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.email import send_approval_decision_notification
from app.models.models import User, DoctorProfile, PharmacistProfile, Patient, AuditEvent

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Schemas ──────────────────────────────────────────────────────────

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


class PendingPharmacistOut(BaseModel):
    id: str
    userId: str
    name: str
    email: str
    phone: Optional[str] = None
    pharmacistIdDisplay: str
    licenseNumber: str
    council: str
    specialization: str
    pharmacyName: Optional[str] = None
    approvalStatus: str
    createdAt: datetime


class PendingPatientOut(BaseModel):
    id: str
    userId: str
    name: str
    email: str
    phone: Optional[str] = None
    patientIdDisplay: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    conditions: List[str] = []
    prescriptionFileUrl: Optional[str] = None
    prescriptionFileName: Optional[str] = None
    approvalStatus: str
    createdAt: datetime


class ApprovalSummaryOut(BaseModel):
    pendingDoctors: int
    pendingPharmacists: int
    pendingPatients: int
    totalPending: int
    totalUsers: int
    activeDoctors: int
    activePharmacists: int
    activePatients: int


class AdminUserOut(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    status: str
    verified: bool
    displayId: Optional[str] = None
    approvalStatus: Optional[str] = None
    createdAt: datetime


class RejectionRequest(BaseModel):
    reason: str


class UpdateStatusRequest(BaseModel):
    status: str  # active, pending, suspended


class BatchApproveRequest(BaseModel):
    doctorProfileIds: List[str] = []
    pharmacistProfileIds: List[str] = []
    patientIds: List[str] = []


# ── Summary Endpoint ────────────────────────────────────────────────

@router.get("/approvals/summary", response_model=ApprovalSummaryOut)
def get_approvals_summary(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Retrieve quick metric counts for all pending and active platform identities."""
    pending_docs = db.query(DoctorProfile).filter(DoctorProfile.approval_status == "pending").count()
    pending_pharms = db.query(PharmacistProfile).filter(PharmacistProfile.approval_status == "pending").count()
    pending_patients = db.query(Patient).filter(
        (Patient.approval_status == "pending") | (Patient.user.has(status="pending"))
    ).count()

    total_users = db.query(User).count()
    active_docs = db.query(User).filter(User.role == "doctor", User.status == "active").count()
    active_pharms = db.query(User).filter(User.role.in_(["pharmacist", "care_team"]), User.status == "active").count()
    active_pats = db.query(User).filter(User.role == "patient", User.status == "active").count()

    return ApprovalSummaryOut(
        pendingDoctors=pending_docs,
        pendingPharmacists=pending_pharms,
        pendingPatients=pending_patients,
        totalPending=pending_docs + pending_pharms + pending_patients,
        totalUsers=total_users,
        activeDoctors=active_docs,
        activePharmacists=active_pharms,
        activePatients=active_pats
    )


# ── Doctor Approvals ─────────────────────────────────────────────────

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
    doc = db.query(DoctorProfile).filter(
        (DoctorProfile.id == profile_id) | (DoctorProfile.user_id == profile_id)
    ).first()
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

    send_approval_decision_notification(user.email, user.name, "doctor", True)

    return {
        "message": f"Doctor {user.name} ({doc.doctor_id_display}) approved successfully",
        "doctorId": doc.id,
        "userId": user.id,
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
    doc = db.query(DoctorProfile).filter(
        (DoctorProfile.id == profile_id) | (DoctorProfile.user_id == profile_id)
    ).first()
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

    send_approval_decision_notification(user.email, user.name, "doctor", False, req.reason.strip())

    return {
        "message": f"Doctor {user.name} credentials rejected",
        "doctorId": doc.id,
        "userId": user.id,
        "status": "rejected"
    }


# ── Pharmacist Approvals ─────────────────────────────────────────────

@router.get("/pharmacists/pending", response_model=List[PendingPharmacistOut])
def get_pending_pharmacists(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """List all pharmacists pending credential verification."""
    profiles = db.query(PharmacistProfile).filter(
        PharmacistProfile.approval_status == "pending"
    ).order_by(PharmacistProfile.created_at.desc()).all()

    results = []
    for pharm in profiles:
        user = db.query(User).filter(User.id == pharm.user_id).first()
        if user:
            results.append(PendingPharmacistOut(
                id=pharm.id,
                userId=user.id,
                name=user.name,
                email=user.email,
                phone=user.phone,
                pharmacistIdDisplay=pharm.pharmacist_id_display,
                licenseNumber=pharm.license_number,
                council=pharm.council,
                specialization=pharm.specialization,
                pharmacyName=pharm.pharmacy_name,
                approvalStatus=pharm.approval_status,
                createdAt=pharm.created_at
            ))
    return results


@router.post("/pharmacists/{profile_id}/approve")
def approve_pharmacist(
    profile_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Approve a pharmacist's pharmacy practice credentials and grant workstation access."""
    pharm = db.query(PharmacistProfile).filter(
        (PharmacistProfile.id == profile_id) | (PharmacistProfile.user_id == profile_id)
    ).first()
    if not pharm:
        raise HTTPException(status_code=404, detail="Pharmacist profile not found")

    user = db.query(User).filter(User.id == pharm.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pharmacist user account not found")

    now = datetime.now(timezone.utc)
    pharm.approval_status = "approved"
    pharm.approved_by = admin_user.id
    pharm.approved_at = now
    user.status = "active"

    db.add(AuditEvent(
        actor_id=admin_user.id,
        action="approve_pharmacist",
        record_type="pharmacist_profile",
        record_id=pharm.id
    ))
    db.commit()

    send_approval_decision_notification(user.email, user.name, "pharmacist", True)

    return {
        "message": f"Pharmacist {user.name} ({pharm.pharmacist_id_display}) approved successfully",
        "pharmacistId": pharm.id,
        "userId": user.id,
        "status": "approved"
    }


@router.post("/pharmacists/{profile_id}/reject")
def reject_pharmacist(
    profile_id: str,
    req: RejectionRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Reject a pharmacist's credentials with specified reason."""
    pharm = db.query(PharmacistProfile).filter(
        (PharmacistProfile.id == profile_id) | (PharmacistProfile.user_id == profile_id)
    ).first()
    if not pharm:
        raise HTTPException(status_code=404, detail="Pharmacist profile not found")

    user = db.query(User).filter(User.id == pharm.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pharmacist user account not found")

    now = datetime.now(timezone.utc)
    pharm.approval_status = "rejected"
    pharm.rejection_reason = req.reason.strip()
    user.status = "suspended"

    db.add(AuditEvent(
        actor_id=admin_user.id,
        action="reject_pharmacist",
        record_type="pharmacist_profile",
        record_id=pharm.id
    ))
    db.commit()

    send_approval_decision_notification(user.email, user.name, "pharmacist", False, req.reason.strip())

    return {
        "message": f"Pharmacist {user.name} credentials rejected",
        "pharmacistId": pharm.id,
        "userId": user.id,
        "status": "rejected"
    }


# ── Patient Approvals ────────────────────────────────────────────────

@router.get("/patients/pending", response_model=List[PendingPatientOut])
def get_pending_patients(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """List all patients pending Medical Board administrative approval."""
    patients = db.query(Patient).join(User, Patient.user_id == User.id).filter(
        (Patient.approval_status == "pending") | (User.status == "pending")
    ).order_by(Patient.created_at.desc()).all()

    results = []
    for pat in patients:
        user = pat.user
        if user and user.status != "suspended" and getattr(pat, "approval_status", None) != "rejected":
            parsed_conditions = []
            if pat.conditions:
                try:
                    loaded = json.loads(pat.conditions)
                    if isinstance(loaded, list):
                        parsed_conditions = loaded
                    elif isinstance(loaded, str):
                        parsed_conditions = [loaded]
                except Exception:
                    parsed_conditions = [str(pat.conditions)]

            results.append(PendingPatientOut(
                id=pat.id,
                userId=user.id,
                name=user.name,
                email=user.email,
                phone=user.phone,
                patientIdDisplay=pat.patient_id_display,
                age=pat.age,
                height=pat.height,
                weight=pat.weight,
                conditions=parsed_conditions,
                prescriptionFileUrl=pat.prescription_file_url,
                prescriptionFileName=pat.prescription_file_name,
                approvalStatus=getattr(pat, "approval_status", None) or "pending",
                createdAt=pat.created_at
            ))
    return results


@router.post("/patients/{patient_id}/approve")
def approve_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Approve a patient's registration and grant access to Patient Portal."""
    pat = db.query(Patient).filter(
        (Patient.id == patient_id) | (Patient.user_id == patient_id)
    ).first()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    user = db.query(User).filter(User.id == pat.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient user account not found")

    now = datetime.now(timezone.utc)
    pat.approval_status = "approved"
    pat.approved_by = admin_user.id
    pat.approved_at = now
    user.status = "active"

    db.add(AuditEvent(
        actor_id=admin_user.id,
        action="approve_patient",
        record_type="patient_profile",
        record_id=pat.id
    ))
    db.commit()

    send_approval_decision_notification(user.email, user.name, "patient", True)

    return {
        "message": f"Patient {user.name} ({pat.patient_id_display}) approved successfully",
        "patientId": pat.id,
        "userId": user.id,
        "status": "approved"
    }


@router.post("/patients/{patient_id}/reject")
def reject_patient(
    patient_id: str,
    req: RejectionRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Reject a patient registration with specified reason."""
    pat = db.query(Patient).filter(
        (Patient.id == patient_id) | (Patient.user_id == patient_id)
    ).first()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    user = db.query(User).filter(User.id == pat.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient user account not found")

    now = datetime.now(timezone.utc)
    pat.approval_status = "rejected"
    pat.rejection_reason = req.reason.strip()
    user.status = "suspended"

    db.add(AuditEvent(
        actor_id=admin_user.id,
        action="reject_patient",
        record_type="patient_profile",
        record_id=pat.id
    ))
    db.commit()

    send_approval_decision_notification(user.email, user.name, "patient", False, req.reason.strip())

    return {
        "message": f"Patient {user.name} registration rejected",
        "patientId": pat.id,
        "userId": user.id,
        "status": "rejected"
    }


# ── Batch Approval ──────────────────────────────────────────────────

@router.post("/approvals/batch-approve")
def batch_approve(
    req: BatchApproveRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Approve multiple pending accounts at once."""
    now = datetime.now(timezone.utc)
    approved_count = 0

    # Doctors
    for profile_id in req.doctorProfileIds:
        doc = db.query(DoctorProfile).filter(
            (DoctorProfile.id == profile_id) | (DoctorProfile.user_id == profile_id)
        ).first()
        if doc and doc.approval_status != "approved":
            doc.approval_status = "approved"
            doc.approved_by = admin_user.id
            doc.approved_at = now
            user = db.query(User).filter(User.id == doc.user_id).first()
            if user:
                user.status = "active"
                send_approval_decision_notification(user.email, user.name, "doctor", True)
            approved_count += 1

    # Pharmacists
    for profile_id in req.pharmacistProfileIds:
        pharm = db.query(PharmacistProfile).filter(
            (PharmacistProfile.id == profile_id) | (PharmacistProfile.user_id == profile_id)
        ).first()
        if pharm and pharm.approval_status != "approved":
            pharm.approval_status = "approved"
            pharm.approved_by = admin_user.id
            pharm.approved_at = now
            user = db.query(User).filter(User.id == pharm.user_id).first()
            if user:
                user.status = "active"
                send_approval_decision_notification(user.email, user.name, "pharmacist", True)
            approved_count += 1

    # Patients
    for patient_id in req.patientIds:
        pat = db.query(Patient).filter(
            (Patient.id == patient_id) | (Patient.user_id == patient_id)
        ).first()
        if pat and getattr(pat, "approval_status", None) != "approved":
            pat.approval_status = "approved"
            pat.approved_by = admin_user.id
            pat.approved_at = now
            user = db.query(User).filter(User.id == pat.user_id).first()
            if user:
                user.status = "active"
                send_approval_decision_notification(user.email, user.name, "patient", True)
            approved_count += 1

    db.commit()
    return {
        "message": f"Successfully approved {approved_count} account(s).",
        "approvedCount": approved_count
    }


# ── User Directory & Status Management ──────────────────────────────

@router.get("/users/all", response_model=List[AdminUserOut])
def get_all_admin_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Retrieve full platform directory of all users with roles and approval states."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    results = []

    for u in users:
        display_id = None
        approval_status = None

        if u.role == "patient" and u.patient_profile:
            display_id = u.patient_profile.patient_id_display
            approval_status = getattr(u.patient_profile, "approval_status", None) or ("pending" if u.status == "pending" else "approved")
        elif u.role == "doctor" and u.doctor_profile:
            display_id = u.doctor_profile.doctor_id_display
            approval_status = u.doctor_profile.approval_status or ("pending" if u.status == "pending" else "approved")
        elif u.role in ("pharmacist", "care_team") and u.pharmacist_profile:
            display_id = u.pharmacist_profile.pharmacist_id_display
            approval_status = u.pharmacist_profile.approval_status or ("pending" if u.status == "pending" else "approved")
        else:
            approval_status = "approved" if u.status == "active" else u.status

        results.append(AdminUserOut(
            id=u.id,
            email=u.email,
            name=u.name,
            phone=u.phone,
            role=u.role,
            status=u.status,
            verified=u.verified,
            displayId=display_id,
            approvalStatus=approval_status,
            createdAt=u.created_at
        ))

    return results


@router.post("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    req: UpdateStatusRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Directly update user status (active, pending, suspended)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot change status of currently logged-in administrator.")

    target_status = req.status.lower()
    if target_status not in ("active", "pending", "suspended"):
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: active, pending, suspended")

    user.status = target_status

    if user.role == "patient" and user.patient_profile:
        user.patient_profile.approval_status = "approved" if target_status == "active" else ("pending" if target_status == "pending" else "rejected")
    elif user.role == "doctor" and user.doctor_profile:
        user.doctor_profile.approval_status = "approved" if target_status == "active" else ("pending" if target_status == "pending" else "rejected")
    elif user.role in ("pharmacist", "care_team") and user.pharmacist_profile:
        user.pharmacist_profile.approval_status = "approved" if target_status == "active" else ("pending" if target_status == "pending" else "rejected")

    db.add(AuditEvent(
        actor_id=admin_user.id,
        action=f"update_status_to_{target_status}",
        record_type="user",
        record_id=user.id
    ))
    db.commit()

    return {
        "message": f"User {user.name} status updated to {target_status}",
        "userId": user.id,
        "status": user.status
    }
