"""Prescription routes — create, activate, revise, list."""

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone, date, timedelta
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_patient_access, require_role
from app.models.models import (
    User, Prescription, PrescriptionItem, DoseInstance, AuditEvent
)

router = APIRouter(tags=["Prescriptions"])


# ── Schemas ──────────────────────────────────────────────────────────

class PrescriptionItemCreate(BaseModel):
    medicine_name: str
    strength: str | None = None
    dose: str
    unit: str | None = None
    route: str = "oral"
    frequency: str
    schedule_times: list[str] | None = None  # ["08:00", "20:00"]
    food_instructions: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_prn: bool = False


class PrescriptionCreate(BaseModel):
    notes: str | None = None
    items: list[PrescriptionItemCreate]


class PrescriptionActivate(BaseModel):
    version: int | None = None  # optimistic concurrency


# ── Helpers ──────────────────────────────────────────────────────────

def generate_dose_instances(item: PrescriptionItem, db: Session, days: int = 7):
    """Generate dose instances for the next N days from schedule_times."""
    if item.is_prn or not item.schedule_times:
        return
    
    try:
        times = json.loads(item.schedule_times) if isinstance(item.schedule_times, str) else item.schedule_times
    except (json.JSONDecodeError, TypeError):
        return
    
    start = item.start_date or date.today()
    end = item.end_date or (start + timedelta(days=days))
    
    current = start
    while current <= end and current <= start + timedelta(days=days):
        for t in times:
            try:
                hour, minute = map(int, t.split(":"))
                scheduled = datetime(current.year, current.month, current.day, hour, minute, tzinfo=timezone.utc)
                
                # Check for duplicate
                exists = db.query(DoseInstance).filter(
                    DoseInstance.prescription_item_id == item.id,
                    DoseInstance.scheduled_time == scheduled
                ).first()
                if not exists:
                    db.add(DoseInstance(
                        prescription_item_id=item.id,
                        scheduled_time=scheduled,
                        status="pending"
                    ))
            except (ValueError, AttributeError):
                continue
        current += timedelta(days=1)


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/patients/{patient_id}/prescriptions", status_code=201)
def create_prescription(
    patient_id: str,
    data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor"))
):
    check_patient_access(patient_id, current_user, db)
    
    if not data.items:
        raise HTTPException(status_code=422, detail="At least one medication item is required")
    
    rx = Prescription(
        patient_id=patient_id,
        prescriber_id=current_user.id,
        status="draft",
        notes=data.notes
    )
    db.add(rx)
    db.flush()
    
    for item_data in data.items:
        item = PrescriptionItem(
            prescription_id=rx.id,
            medicine_name=item_data.medicine_name,
            strength=item_data.strength,
            dose=item_data.dose,
            unit=item_data.unit,
            route=item_data.route,
            frequency=item_data.frequency,
            schedule_times=json.dumps(item_data.schedule_times) if item_data.schedule_times else None,
            food_instructions=item_data.food_instructions,
            start_date=item_data.start_date,
            end_date=item_data.end_date,
            is_prn=item_data.is_prn
        )
        db.add(item)
    
    db.add(AuditEvent(
        actor_id=current_user.id, action="create_prescription",
        record_type="prescription", record_id=rx.id
    ))
    db.commit()
    db.refresh(rx)
    
    return {"message": "Prescription draft created", "id": rx.id, "status": rx.status}


@router.post("/prescriptions/{rx_id}/activate")
def activate_prescription(
    rx_id: str,
    data: PrescriptionActivate | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor"))
):
    rx = db.query(Prescription).filter(Prescription.id == rx_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    check_patient_access(rx.patient_id, current_user, db)
    
    if rx.status != "draft":
        raise HTTPException(status_code=409, detail=f"Cannot activate a {rx.status} prescription")
    
    # Version check for concurrency
    if data and data.version and data.version != rx.version:
        raise HTTPException(status_code=409, detail="Version conflict — prescription was modified")
    
    # Supersede any existing active prescription for this patient
    active = db.query(Prescription).filter(
        Prescription.patient_id == rx.patient_id,
        Prescription.status == "active"
    ).all()
    for old in active:
        old.status = "superseded"
        # Cancel future pending dose instances
        for item in old.items:
            db.query(DoseInstance).filter(
                DoseInstance.prescription_item_id == item.id,
                DoseInstance.status == "pending",
                DoseInstance.scheduled_time > datetime.now(timezone.utc)
            ).update({"status": "cancelled"})
    
    rx.status = "active"
    rx.activated_at = datetime.now(timezone.utc)
    
    # Generate dose instances for active items
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == rx.id).all()
    for item in items:
        generate_dose_instances(item, db)
    
    db.add(AuditEvent(
        actor_id=current_user.id, action="activate_prescription",
        record_type="prescription", record_id=rx.id
    ))
    db.commit()
    
    return {"message": "Prescription activated", "id": rx.id, "status": "active"}


@router.post("/prescriptions/{rx_id}/revisions", status_code=201)
def create_revision(
    rx_id: str,
    data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor"))
):
    old = db.query(Prescription).filter(Prescription.id == rx_id).first()
    if not old:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    check_patient_access(old.patient_id, current_user, db)
    
    # Create new version
    new_rx = Prescription(
        patient_id=old.patient_id,
        prescriber_id=current_user.id,
        status="draft",
        version=old.version + 1,
        notes=data.notes,
        reason=f"Revision of prescription {rx_id}"
    )
    db.add(new_rx)
    db.flush()
    
    for item_data in data.items:
        item = PrescriptionItem(
            prescription_id=new_rx.id,
            medicine_name=item_data.medicine_name,
            strength=item_data.strength,
            dose=item_data.dose,
            unit=item_data.unit,
            route=item_data.route,
            frequency=item_data.frequency,
            schedule_times=json.dumps(item_data.schedule_times) if item_data.schedule_times else None,
            food_instructions=item_data.food_instructions,
            start_date=item_data.start_date,
            end_date=item_data.end_date,
            is_prn=item_data.is_prn
        )
        db.add(item)
    
    db.add(AuditEvent(
        actor_id=current_user.id, action="revise_prescription",
        record_type="prescription", record_id=new_rx.id,
        details=f'{{"previous_version": "{rx_id}"}}'
    ))
    db.commit()
    
    return {"message": "Revision created", "id": new_rx.id, "version": new_rx.version}


@router.get("/patients/{patient_id}/prescriptions")
def list_prescriptions(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: str | None = None
):
    check_patient_access(patient_id, current_user, db)
    
    query = db.query(Prescription).filter(Prescription.patient_id == patient_id)
    if status_filter:
        query = query.filter(Prescription.status == status_filter)
    
    prescriptions = query.order_by(Prescription.created_at.desc()).all()
    results = []
    for rx in prescriptions:
        prescriber = db.query(User).filter(User.id == rx.prescriber_id).first()
        items = []
        for item in rx.items:
            schedule = []
            if item.schedule_times:
                try:
                    schedule = json.loads(item.schedule_times)
                except (json.JSONDecodeError, TypeError):
                    schedule = []
            items.append({
                "id": item.id, "medicine_name": item.medicine_name,
                "strength": item.strength, "dose": item.dose,
                "unit": item.unit, "route": item.route,
                "frequency": item.frequency, "schedule_times": schedule,
                "food_instructions": item.food_instructions,
                "start_date": str(item.start_date) if item.start_date else None,
                "end_date": str(item.end_date) if item.end_date else None,
                "is_prn": item.is_prn
            })
        
        results.append({
            "id": rx.id, "status": rx.status, "version": rx.version,
            "prescriber_name": prescriber.name if prescriber else "",
            "notes": rx.notes,
            "created_at": rx.created_at.isoformat() if rx.created_at else None,
            "activated_at": rx.activated_at.isoformat() if rx.activated_at else None,
            "items": items
        })
    
    return {"prescriptions": results}
