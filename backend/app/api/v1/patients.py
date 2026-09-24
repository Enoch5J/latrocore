"""Patient routes — profiles, list, assignments."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from datetime import date
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_patient_access, require_role
from app.models.models import User, Patient, Assignment, AuditEvent

router = APIRouter(prefix="/patients", tags=["Patients"])


# ── Schemas ──────────────────────────────────────────────────────────

class PatientUpdate(BaseModel):
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    language: str | None = None
    timezone: str | None = None
    allergies: str | None = None
    conditions: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None


class AssignmentCreate(BaseModel):
    patient_id: str
    user_id: str
    role: str
    start_date: date | None = None
    end_date: date | None = None


class PatientOut(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    date_of_birth: date | None = None
    gender: str | None = None
    blood_type: str | None = None
    language: str | None = None
    timezone: str | None = None
    allergies: str | None = None
    conditions: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────

@router.get("")
def list_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100)
):
    """List patients scoped by role. Doctors/care_team see only assigned patients."""
    query = db.query(Patient).join(User, Patient.user_id == User.id)
    
    if current_user.role == "patient":
        query = query.filter(Patient.user_id == current_user.id)
    elif current_user.role in ("doctor", "care_team"):
        assigned_patient_ids = db.query(Assignment.patient_id).filter(
            Assignment.user_id == current_user.id,
            Assignment.start_date <= date.today(),
            (Assignment.end_date.is_(None)) | (Assignment.end_date >= date.today())
        ).subquery()
        query = query.filter(Patient.id.in_(assigned_patient_ids))
    # admin sees all
    
    total = query.count()
    patients = query.offset((page - 1) * per_page).limit(per_page).all()
    
    results = []
    for p in patients:
        user = db.query(User).filter(User.id == p.user_id).first()
        results.append({
            "id": p.id, "user_id": p.user_id,
            "name": user.name if user else "", "email": user.email if user else "",
            "date_of_birth": str(p.date_of_birth) if p.date_of_birth else None,
            "gender": p.gender, "blood_type": p.blood_type,
            "language": p.language, "timezone": p.timezone,
            "allergies": p.allergies, "conditions": p.conditions,
            "emergency_contact_name": p.emergency_contact_name,
            "emergency_contact_phone": p.emergency_contact_phone
        })
    
    return {"patients": results, "total": total, "page": page, "per_page": per_page}


@router.get("/{patient_id}")
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get patient profile with access check."""
    patient = check_patient_access(patient_id, current_user, db)
    user = db.query(User).filter(User.id == patient.user_id).first()
    
    # Get assignments
    assignments = db.query(Assignment).filter(Assignment.patient_id == patient_id).all()
    assignment_list = []
    for a in assignments:
        assigned_user = db.query(User).filter(User.id == a.user_id).first()
        assignment_list.append({
            "id": a.id, "user_id": a.user_id,
            "user_name": assigned_user.name if assigned_user else "",
            "role": a.role,
            "start_date": str(a.start_date) if a.start_date else None,
            "end_date": str(a.end_date) if a.end_date else None
        })
    
    return {
        "id": patient.id, "user_id": patient.user_id,
        "name": user.name if user else "", "email": user.email if user else "",
        "phone": user.phone if user else "",
        "date_of_birth": str(patient.date_of_birth) if patient.date_of_birth else None,
        "gender": patient.gender, "blood_type": patient.blood_type,
        "language": patient.language, "timezone": patient.timezone,
        "allergies": patient.allergies, "conditions": patient.conditions,
        "medicine_history": patient.medicine_history,
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
        "assignments": assignment_list
    }


@router.patch("/{patient_id}")
def update_patient(
    patient_id: str,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = check_patient_access(patient_id, current_user, db)
    update_data = data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(patient, key, value)
    
    db.add(AuditEvent(
        actor_id=current_user.id, action="update_patient",
        record_type="patient", record_id=patient_id
    ))
    db.commit()
    db.refresh(patient)
    return {"message": "Patient updated", "id": patient.id}


@router.post("/assignments", status_code=201)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "doctor"))
):
    assignment = Assignment(
        patient_id=data.patient_id,
        user_id=data.user_id,
        role=data.role,
        start_date=data.start_date or date.today(),
        end_date=data.end_date,
        assigned_by=current_user.id
    )
    db.add(assignment)
    db.add(AuditEvent(
        actor_id=current_user.id, action="create_assignment",
        record_type="assignment", record_id=assignment.id
    ))
    db.commit()
    return {"message": "Assignment created", "id": assignment.id}


@router.get("/{patient_id}/assignments")
def list_assignments(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_patient_access(patient_id, current_user, db)
    assignments = db.query(Assignment).filter(Assignment.patient_id == patient_id).all()
    results = []
    for a in assignments:
        user = db.query(User).filter(User.id == a.user_id).first()
        results.append({
            "id": a.id, "user_id": a.user_id,
            "user_name": user.name if user else "",
            "role": a.role,
            "start_date": str(a.start_date) if a.start_date else None,
            "end_date": str(a.end_date) if a.end_date else None
        })
    return {"assignments": results}
