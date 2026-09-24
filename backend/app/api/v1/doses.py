"""Dose tracking routes — schedule view, event logging."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone, date, timedelta
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_patient_access
from app.models.models import (
    User, DoseInstance, DoseEvent, PrescriptionItem, Prescription, AuditEvent
)

router = APIRouter(tags=["Dose Tracking"])


class DoseEventCreate(BaseModel):
    event_time: datetime
    status: str  # taken, missed, skipped
    reason: str | None = None


@router.get("/patients/{patient_id}/schedule")
def get_dose_schedule(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    target_date: date | None = Query(None),
    days: int = Query(1, ge=1, le=14)
):
    """Get dose schedule for a patient for a given date range."""
    check_patient_access(patient_id, current_user, db)
    
    target = target_date or date.today()
    start_dt = datetime(target.year, target.month, target.day, tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(days=days)
    
    # Get active prescription items
    active_rx = db.query(Prescription).filter(
        Prescription.patient_id == patient_id,
        Prescription.status == "active"
    ).all()
    
    results = []
    for rx in active_rx:
        for item in rx.items:
            instances = db.query(DoseInstance).filter(
                DoseInstance.prescription_item_id == item.id,
                DoseInstance.scheduled_time >= start_dt,
                DoseInstance.scheduled_time < end_dt,
                DoseInstance.status != "cancelled"
            ).order_by(DoseInstance.scheduled_time).all()
            
            for inst in instances:
                # Get latest event
                latest_event = db.query(DoseEvent).filter(
                    DoseEvent.dose_instance_id == inst.id
                ).order_by(DoseEvent.created_at.desc()).first()
                
                results.append({
                    "id": inst.id,
                    "medicine_name": item.medicine_name,
                    "dose": item.dose,
                    "strength": item.strength,
                    "route": item.route,
                    "food_instructions": item.food_instructions,
                    "scheduled_time": inst.scheduled_time.isoformat(),
                    "status": inst.status,
                    "event": {
                        "id": latest_event.id,
                        "event_time": latest_event.event_time.isoformat(),
                        "status": latest_event.status,
                        "reason": latest_event.reason
                    } if latest_event else None
                })
    
    results.sort(key=lambda x: x["scheduled_time"])
    return {"schedule": results, "date": str(target), "days": days}


@router.post("/dose-instances/{instance_id}/events", status_code=201)
def record_dose_event(
    instance_id: str,
    data: DoseEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a taken/missed/skipped event for a dose instance."""
    instance = db.query(DoseInstance).filter(DoseInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Dose instance not found")
    
    # Get patient_id through prescription chain
    item = db.query(PrescriptionItem).filter(PrescriptionItem.id == instance.prescription_item_id).first()
    rx = db.query(Prescription).filter(Prescription.id == item.prescription_id).first()
    check_patient_access(rx.patient_id, current_user, db)
    
    if data.status not in ("taken", "missed", "skipped"):
        raise HTTPException(status_code=422, detail="Status must be 'taken', 'missed' or 'skipped'")
    
    # Create event
    event = DoseEvent(
        dose_instance_id=instance_id,
        event_time=data.event_time,
        status=data.status,
        actor_id=current_user.id,
        reason=data.reason
    )
    db.add(event)
    
    # Update instance status
    instance.status = data.status
    
    db.add(AuditEvent(
        actor_id=current_user.id, action=f"dose_{data.status}",
        record_type="dose_instance", record_id=instance_id
    ))
    db.commit()
    
    return {"message": f"Dose marked as {data.status}", "event_id": event.id}


@router.get("/patients/{patient_id}/adherence")
def get_adherence(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int = Query(7, ge=1, le=90)
):
    """Calculate medication adherence for a patient over a period."""
    check_patient_access(patient_id, current_user, db)
    
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get all dose instances for this patient in the period
    active_rx = db.query(Prescription).filter(
        Prescription.patient_id == patient_id
    ).all()
    
    total = 0
    taken = 0
    missed = 0
    unknown = 0
    
    for rx in active_rx:
        for item in rx.items:
            instances = db.query(DoseInstance).filter(
                DoseInstance.prescription_item_id == item.id,
                DoseInstance.scheduled_time >= since,
                DoseInstance.scheduled_time <= datetime.now(timezone.utc),
                DoseInstance.status != "cancelled"
            ).all()
            
            for inst in instances:
                total += 1
                if inst.status == "taken":
                    taken += 1
                elif inst.status == "missed":
                    missed += 1
                else:
                    unknown += 1
    
    adherence_pct = round((taken / total * 100), 1) if total > 0 else None
    
    return {
        "period_days": days,
        "total_doses": total,
        "taken": taken,
        "missed": missed,
        "unknown": unknown,
        "adherence_percentage": adherence_pct
    }
