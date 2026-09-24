"""Observation routes — glucose, BP, weight, HbA1c, lifestyle."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
from decimal import Decimal
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_patient_access
from app.models.models import User, Observation, AuditEvent

router = APIRouter(prefix="/patients/{patient_id}/observations", tags=["Observations"])


# ── Schemas ──────────────────────────────────────────────────────────

class ObservationCreate(BaseModel):
    type: str  # glucose, hba1c, blood_pressure, weight, meal, activity, sleep
    value: float
    value_secondary: float | None = None  # diastolic BP
    unit: str
    measured_at: datetime
    context: str | None = None  # fasting, pre_meal, post_meal, random
    meal_interval: int | None = None
    symptoms: str | None = None
    activity: str | None = None
    notes: str | None = None
    source: str = "manual"


class ObservationCorrect(BaseModel):
    value: float
    value_secondary: float | None = None
    unit: str | None = None
    reason: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_observation(
    patient_id: str,
    data: ObservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_patient_access(patient_id, current_user, db)
    
    # Validate unit by type
    valid_units = {
        "glucose": ["mg/dL", "mmol/L"],
        "hba1c": ["%", "mmol/mol"],
        "blood_pressure": ["mmHg"],
        "weight": ["kg", "lbs"],
        "meal": ["entry"],
        "activity": ["minutes"],
        "sleep": ["hours"],
    }
    if data.type in valid_units and data.unit not in valid_units[data.type]:
        raise HTTPException(status_code=422, detail=f"Invalid unit '{data.unit}' for type '{data.type}'. Valid: {valid_units[data.type]}")
    
    obs = Observation(
        patient_id=patient_id,
        type=data.type,
        value=data.value,
        value_secondary=data.value_secondary,
        unit=data.unit,
        measured_at=data.measured_at,
        context=data.context,
        meal_interval=data.meal_interval,
        symptoms=data.symptoms,
        activity=data.activity,
        notes=data.notes,
        source=data.source,
        actor_id=current_user.id
    )
    db.add(obs)
    db.add(AuditEvent(
        actor_id=current_user.id, action="create_observation",
        record_type="observation", record_id=obs.id
    ))
    db.commit()
    db.refresh(obs)
    
    return {
        "id": obs.id, "type": obs.type, "value": float(obs.value),
        "unit": obs.unit, "measured_at": obs.measured_at.isoformat(),
        "context": obs.context, "message": "Observation recorded"
    }


@router.get("")
def list_observations(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    type: str | None = Query(None),
    context: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200)
):
    check_patient_access(patient_id, current_user, db)
    
    query = db.query(Observation).filter(
        Observation.patient_id == patient_id,
        Observation.superseded_by.is_(None)  # exclude superseded
    )
    
    if type:
        query = query.filter(Observation.type == type)
    if context:
        query = query.filter(Observation.context == context)
    if start_date:
        query = query.filter(Observation.measured_at >= start_date)
    if end_date:
        query = query.filter(Observation.measured_at <= end_date)
    
    total = query.count()
    observations = query.order_by(Observation.measured_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    results = []
    for o in observations:
        results.append({
            "id": o.id, "type": o.type,
            "value": float(o.value), "value_secondary": float(o.value_secondary) if o.value_secondary else None,
            "unit": o.unit,
            "measured_at": o.measured_at.isoformat(),
            "context": o.context, "meal_interval": o.meal_interval,
            "symptoms": o.symptoms, "activity": o.activity,
            "notes": o.notes, "source": o.source
        })
    
    return {"observations": results, "total": total, "page": page, "per_page": per_page}


@router.post("/{obs_id}/correct")
def correct_observation(
    patient_id: str,
    obs_id: str,
    data: ObservationCorrect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_patient_access(patient_id, current_user, db)
    original = db.query(Observation).filter(Observation.id == obs_id, Observation.patient_id == patient_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Observation not found")
    
    # Create corrected copy
    corrected = Observation(
        patient_id=patient_id,
        type=original.type,
        value=data.value,
        value_secondary=data.value_secondary,
        unit=data.unit or original.unit,
        measured_at=original.measured_at,
        context=original.context,
        source="correction",
        actor_id=current_user.id,
        notes=data.reason or "Corrected value"
    )
    db.add(corrected)
    db.flush()
    
    # Mark original as superseded
    original.superseded_by = corrected.id
    db.add(AuditEvent(
        actor_id=current_user.id, action="correct_observation",
        record_type="observation", record_id=obs_id,
        details=f'{{"corrected_to": "{corrected.id}"}}'
    ))
    db.commit()
    
    return {"message": "Observation corrected", "new_id": corrected.id, "original_id": obs_id}
