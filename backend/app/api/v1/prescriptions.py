"""Prescription routes — create, activate, revise, list, and Gemini AI Digitization."""

import hashlib
import os
import re
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List, Dict, Any
from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    check_patient_access,
    require_role,
    get_or_create_patient_profile,
)
from app.models.models import (
    User,
    Patient,
    CarePlan,
    Prescription,
    PrescriptionItem,
    DoseInstance,
    AuditEvent,
    Attachment,
    PrescriptionUpload,
)
from app.services.prescription_ai import analyze_prescription_with_gemini

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


class AIPrescriptionMedicine(BaseModel):
    name: str
    dose: str | None = None
    route: str | None = "Oral"
    frequency: str | None = None
    schedule_times: list[str] = []
    meal_timing: str | None = None
    is_prn: bool = False
    is_insulin: bool = False
    instructions: str | None = None


class AIPrescriptionApplyRequest(BaseModel):
    patient_id: str | None = None
    doctor_name: str | None = None
    clinic_name: str | None = None
    diagnosis: str | None = None
    prescription_date: str | None = None
    medicines: list[AIPrescriptionMedicine]
    diet_plan: dict | None = None
    daily_schedule: dict | None = None
    file_url: str | None = None


class AnalyzeTextRequest(BaseModel):
    text: str


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
    try:
        db.commit()
        db.refresh(rx)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database commit error: {str(exc)}"
        )
    
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


# ── Gemini AI Prescription Digitization Endpoints ────────────────────

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE = 12 * 1024 * 1024  # 12 MB


def validate_uploaded_prescription_meta(filename: Optional[str]) -> str:
    clean_name = filename or "prescription"
    ext = os.path.splitext(clean_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPG, JPEG, WEBP."
        )
    return clean_name


def format_prescription_context_from_dict(parsed: Dict[str, Any]) -> Optional[str]:
    """Serialize extracted prescription data faithfully without guessing missing timings."""
    medicines = parsed.get("medicines") or []
    if not medicines:
        return None
    lines = []
    meta_parts = []
    if parsed.get("doctor_name"):
        meta_parts.append(f"Prescriber: {parsed['doctor_name']}")
    if parsed.get("diagnosis"):
        meta_parts.append(f"Diagnosis: {parsed['diagnosis']}")
    if parsed.get("prescription_date"):
        meta_parts.append(f"Date: {parsed['prescription_date']}")
    if meta_parts:
        lines.append("Document Metadata: " + " | ".join(meta_parts))

    for m in medicines:
        if not isinstance(m, dict):
            continue
        name = m.get("name") or "unclear"
        dose = m.get("dose") or "not specified"
        route = m.get("route") or "not specified"
        frequency = m.get("frequency") or "not specified"
        times = m.get("schedule_times") or []
        times_str = ", ".join(str(t) for t in times) if times else "not specified"
        meal_timing = m.get("meal_timing") or m.get("food_instructions") or "not specified"
        instructions = m.get("instructions") or "not specified"
        lines.append(
            f"- {name} | Dose: {dose} | Route: {route} | Frequency: {frequency} "
            f"| Schedule Times: {times_str} | Meal Timing: {meal_timing} | Instructions: {instructions}"
        )
    return "\n".join(lines) if lines else None


def get_patient_prescription_context(
    user: User,
    db: Session,
    upload_id: Optional[str] = None,
    prescription_id: Optional[str] = None,
) -> Optional[str]:
    """Load prescription context strictly for the authenticated patient (never another patient's)."""
    if user.role != "patient":
        return None

    patient = db.query(Patient).filter(Patient.user_id == user.id).first()

    if upload_id:
        upload_rec = db.query(PrescriptionUpload).filter(PrescriptionUpload.id == upload_id).first()
        if not upload_rec:
            raise HTTPException(status_code=404, detail="Uploaded prescription not found")
        if upload_rec.user_id != user.id and (not patient or upload_rec.patient_id != patient.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this prescription upload")
        if upload_rec.extracted_json:
            try:
                return format_prescription_context_from_dict(json.loads(upload_rec.extracted_json))
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    if prescription_id:
        rx = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not rx:
            raise HTTPException(status_code=404, detail="Prescription not found")
        if not patient or rx.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this prescription")
        items = [
            {
                "name": it.medicine_name,
                "dose": it.dose,
                "route": it.route,
                "frequency": it.frequency,
                "schedule_times": json.loads(it.schedule_times) if it.schedule_times else [],
                "meal_timing": it.food_instructions,
                "instructions": it.food_instructions,
            }
            for it in rx.items
        ]
        return format_prescription_context_from_dict({"medicines": items})

    # Default: fetch the patient's latest uploaded prescription or active Rx
    latest_upload = (
        db.query(PrescriptionUpload)
        .filter(PrescriptionUpload.user_id == user.id)
        .order_by(PrescriptionUpload.created_at.desc())
        .first()
    )
    if latest_upload and latest_upload.extracted_json:
        try:
            ctx = format_prescription_context_from_dict(json.loads(latest_upload.extracted_json))
            if ctx:
                return ctx
        except (json.JSONDecodeError, TypeError):
            pass

    if patient:
        active_rx = (
            db.query(Prescription)
            .filter(Prescription.patient_id == patient.id, Prescription.status == "active")
            .order_by(Prescription.created_at.desc())
            .first()
        )
        if active_rx and active_rx.items:
            items = [
                {
                    "name": it.medicine_name,
                    "dose": it.dose,
                    "route": it.route,
                    "frequency": it.frequency,
                    "schedule_times": json.loads(it.schedule_times) if it.schedule_times else [],
                    "meal_timing": it.food_instructions,
                    "instructions": it.food_instructions,
                }
                for it in active_rx.items
            ]
            return format_prescription_context_from_dict({"medicines": items})

    return None


async def save_and_analyze_prescription(
    db: Session,
    current_user: User,
    file_bytes: Optional[bytes] = None,
    filename: Optional[str] = None,
    mime_type: Optional[str] = None,
    text_content: Optional[str] = None,
) -> Dict[str, Any]:
    """Validate, analyze with Gemini, store securely, and link ownership to current patient."""
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only signed-in patients can upload prescriptions.",
        )

    parsed = await analyze_prescription_with_gemini(
        file_bytes=file_bytes,
        mime_type=mime_type,
        text_content=text_content,
    )

    patient = get_or_create_patient_profile(current_user, db)
    saved_url = None
    file_path = None
    clean_name = filename or "prescription"

    if file_bytes is not None:
        upload_dir = os.path.join("uploads", "prescriptions")
        os.makedirs(upload_dir, exist_ok=True)
        safe_name = f"{uuid.uuid4().hex}_{re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)}"
        file_path = os.path.join(upload_dir, safe_name)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        saved_url = f"/uploads/prescriptions/{safe_name}"

        attachment = Attachment(
            patient_id=patient.id,
            file_name=clean_name,
            file_path=saved_url,
            file_hash=hashlib.sha256(file_bytes).hexdigest(),
            file_size=len(file_bytes),
            mime_type=mime_type or "image/jpeg",
            scan_status="clean",
            uploaded_by=current_user.id,
        )
        db.add(attachment)
        patient.prescription_file_url = saved_url
        patient.prescription_file_name = clean_name

    upload_rec = PrescriptionUpload(
        patient_id=patient.id,
        user_id=current_user.id,
        file_name=clean_name if file_bytes is not None else "text-prescription",
        file_path=file_path,
        file_url=saved_url,
        mime_type=mime_type if file_bytes is not None else "text/plain",
        file_size=len(file_bytes) if file_bytes is not None else len((text_content or "").encode("utf-8")),
        extracted_json=json.dumps(parsed),
    )
    db.add(upload_rec)
    db.commit()
    db.refresh(upload_rec)

    parsed["upload_id"] = upload_rec.id
    if saved_url:
        parsed["file_url"] = saved_url
    return parsed


@router.post("/prescriptions/analyze")
async def analyze_prescription_endpoint(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    """
    Directly extracts and digitizes an uploaded doctor prescription (image/PDF or text)
    using Gemini AI multimodal vision for signed-in patients only.
    Returns 401 for guests and 403 for signed-in non-patients.
    """
    file_bytes = None
    mime_type = None
    filename = None

    if file:
        filename = validate_uploaded_prescription_meta(file.filename)
        file_bytes = await file.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the maximum allowed limit of 12 MB."
            )
        mime_type = file.content_type or "image/jpeg"

    return await save_and_analyze_prescription(
        db=db,
        current_user=current_user,
        file_bytes=file_bytes,
        filename=filename,
        mime_type=mime_type,
        text_content=text,
    )


@router.post("/prescriptions/analyze-json")
async def analyze_prescription_json_endpoint(
    req: AnalyzeTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    """Analyze digital prescription text using Gemini AI (signed-in patients only)."""
    return await save_and_analyze_prescription(
        db=db,
        current_user=current_user,
        text_content=req.text,
    )


@router.get("/prescriptions/uploads")
def list_my_prescription_uploads(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("patient")),
):
    """List only the signed-in patient's own uploaded prescriptions."""
    uploads = (
        db.query(PrescriptionUpload)
        .filter(PrescriptionUpload.user_id == current_user.id)
        .order_by(PrescriptionUpload.created_at.desc())
        .all()
    )
    results = []
    for u in uploads:
        parsed = None
        if u.extracted_json:
            try:
                parsed = json.loads(u.extracted_json)
            except (json.JSONDecodeError, TypeError):
                parsed = None
        results.append({
            "id": u.id,
            "file_name": u.file_name,
            "file_url": u.file_url,
            "mime_type": u.mime_type,
            "file_size": u.file_size,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "extracted": parsed,
        })
    return {"uploads": results}


@router.get("/prescriptions/uploads/{upload_id}")
def get_prescription_upload_detail(
    upload_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single uploaded prescription, enforcing patient self-only access."""
    upload_rec = db.query(PrescriptionUpload).filter(PrescriptionUpload.id == upload_id).first()
    if not upload_rec:
        raise HTTPException(status_code=404, detail="Uploaded prescription not found")

    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if upload_rec.user_id != current_user.id and (not patient or upload_rec.patient_id != patient.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this prescription upload")
    elif current_user.role in ("doctor", "pharmacist", "care_team"):
        check_patient_access(upload_rec.patient_id, current_user, db)
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    parsed = None
    if upload_rec.extracted_json:
        try:
            parsed = json.loads(upload_rec.extracted_json)
        except (json.JSONDecodeError, TypeError):
            parsed = None

    return {
        "id": upload_rec.id,
        "patient_id": upload_rec.patient_id,
        "file_name": upload_rec.file_name,
        "file_url": upload_rec.file_url,
        "mime_type": upload_rec.mime_type,
        "file_size": upload_rec.file_size,
        "created_at": upload_rec.created_at.isoformat() if upload_rec.created_at else None,
        "extracted": parsed,
    }


@router.get("/prescriptions/{rx_id}")
def get_prescription_by_id(
    rx_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a specific prescription only if authorized for that patient."""
    rx = db.query(Prescription).filter(Prescription.id == rx_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    check_patient_access(rx.patient_id, current_user, db)
    return {
        "id": rx.id,
        "patient_id": rx.patient_id,
        "status": rx.status,
        "version": rx.version,
        "notes": rx.notes,
        "created_at": rx.created_at.isoformat() if rx.created_at else None,
        "activated_at": rx.activated_at.isoformat() if rx.activated_at else None,
        "items": [
            {
                "id": item.id,
                "medicine_name": item.medicine_name,
                "strength": item.strength,
                "dose": item.dose,
                "unit": item.unit,
                "route": item.route,
                "frequency": item.frequency,
                "schedule_times": json.loads(item.schedule_times) if item.schedule_times else [],
                "food_instructions": item.food_instructions,
                "is_prn": item.is_prn,
            }
            for item in rx.items
        ],
    }


@router.post("/prescriptions/apply")
def apply_ai_prescription_endpoint(
    req: AIPrescriptionApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Confirms and applies a Gemini AI electronic prescription into active patient care:
    1. Supersedes any previous active prescriptions.
    2. Inserts verified prescription with exact medication doses and schedules.
    3. Automatically generates active dose instances for daily patient logging.
    4. Synchronizes clinical CarePlan (diet plan, target calories/carbs, and daily schedule).
    """
    if not req.medicines:
        raise HTTPException(status_code=422, detail="At least one medicine is required to activate a prescription.")

    # 1. Resolve Patient (strictly isolate patients to their own profile)
    patient = None
    if current_user.role == "patient":
        if req.patient_id:
            requested_patient = db.query(Patient).filter(
                (Patient.id == req.patient_id) | (Patient.user_id == req.patient_id)
            ).first()
            if requested_patient and requested_patient.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Patients can only manage their own prescriptions."
                )

        patient = get_or_create_patient_profile(current_user, db)

        if req.file_url:
            other_upload = db.query(PrescriptionUpload).filter(
                PrescriptionUpload.file_url == req.file_url,
                PrescriptionUpload.user_id != current_user.id
            ).first()
            other_attachment = db.query(Attachment).filter(
                Attachment.file_path == req.file_url,
                Attachment.uploaded_by != current_user.id
            ).first()
            if other_upload or other_attachment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to reference another patient's uploaded file."
                )
    else:
        # Clinician (doctor, pharmacist, care_team, admin)
        if not req.patient_id:
            raise HTTPException(status_code=400, detail="patient_id is required when creating a prescription as a clinician.")
        patient = check_patient_access(req.patient_id, current_user, db)

    now = datetime.now(timezone.utc)

    # 2. Supersede any existing active prescription for this patient
    active_rxs = db.query(Prescription).filter(
        Prescription.patient_id == patient.id,
        Prescription.status == "active"
    ).all()
    for old_rx in active_rxs:
        old_rx.status = "superseded"
        for item in old_rx.items:
            db.query(DoseInstance).filter(
                DoseInstance.prescription_item_id == item.id,
                DoseInstance.status == "pending",
                DoseInstance.scheduled_time > now
            ).update({"status": "cancelled"})

    # 3. Create New Active Prescription
    doc_display = req.doctor_name or "Attending Physician"
    clinic_display = f" ({req.clinic_name})" if req.clinic_name else ""
    diag_display = f" — Diagnosis: {req.diagnosis}" if req.diagnosis else ""

    rx = Prescription(
        patient_id=patient.id,
        prescriber_id=current_user.id,
        status="active",
        notes=f"Gemini AI Verified e-Prescription: {doc_display}{clinic_display}{diag_display}",
        activated_at=now
    )
    db.add(rx)
    db.flush()

    # 4. Insert Prescription Items & Generate Dose Instances without inventing missing timings
    for med in req.medicines:
        times = med.schedule_times or []
        freq_str = med.frequency or "not specified"
        dose_str = med.dose or "not specified"
        food_inst = med.meal_timing or med.instructions or None

        item = PrescriptionItem(
            prescription_id=rx.id,
            medicine_name=med.name,
            strength=dose_str,
            dose=dose_str,
            route=med.route or "Oral",
            frequency=freq_str,
            schedule_times=json.dumps(times) if times else None,
            food_instructions=food_inst,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            is_prn=med.is_prn
        )
        db.add(item)
        db.flush()

        # Generate 14 days of scheduled dose instances only when explicit times exist
        generate_dose_instances(item, db, days=14)

    # 5. Create or Update CarePlan with Diet Plan and Daily Schedule
    plan_rules = {
        "doctor_name": req.doctor_name,
        "clinic_name": req.clinic_name,
        "diagnosis": req.diagnosis,
        "prescription_date": req.prescription_date or str(date.today()),
        "diet_plan": req.diet_plan or {},
        "daily_schedule": req.daily_schedule or {}
    }

    care_plan = db.query(CarePlan).filter(CarePlan.patient_id == patient.id).order_by(CarePlan.version.desc()).first()
    new_version = (care_plan.version + 1) if care_plan else 1

    new_plan = CarePlan(
        patient_id=patient.id,
        author_id=current_user.id,
        version=new_version,
        rules=json.dumps(plan_rules),
        effective_from=date.today(),
        effective_to=date.today() + timedelta(days=90)
    )
    db.add(new_plan)

    # 6. Update Patient metadata
    if req.file_url:
        patient.prescription_file_url = req.file_url
    if req.diagnosis:
        patient.conditions = req.diagnosis

    db.add(AuditEvent(
        actor_id=current_user.id,
        action="apply_ai_prescription",
        record_type="prescription",
        record_id=rx.id,
        details=f'{{"doctor": "{doc_display}", "medicines_count": {len(req.medicines)}}}'
    ))

    try:
        db.commit()
        db.refresh(rx)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database commit error: {str(exc)}"
        )

    return {
        "message": "Electronic prescription verified and activated successfully.",
        "prescription_id": rx.id,
        "patient_id": patient.id,
        "medicines_count": len(req.medicines),
        "status": "active",
        "diet_plan": req.diet_plan,
        "daily_schedule": req.daily_schedule
    }

