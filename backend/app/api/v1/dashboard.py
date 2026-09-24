"""Dashboard summary and notifications."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta, date
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_patient_access
from app.models.models import (
    User, Patient, Observation, Prescription, PrescriptionItem,
    DoseInstance, ScreeningTask, Referral, Ticket, Notification,
    Investigation, AuditEvent
)

router = APIRouter(tags=["Dashboard & Notifications"])


@router.get("/patients/{patient_id}/summary")
def get_patient_summary(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Comprehensive patient dashboard summary."""
    patient = check_patient_access(patient_id, current_user, db)
    user = db.query(User).filter(User.id == patient.user_id).first()
    
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    
    # ── Latest readings ──
    latest_glucose = db.query(Observation).filter(
        Observation.patient_id == patient_id,
        Observation.type == "glucose",
        Observation.superseded_by.is_(None)
    ).order_by(Observation.measured_at.desc()).first()
    
    latest_bp = db.query(Observation).filter(
        Observation.patient_id == patient_id,
        Observation.type == "blood_pressure",
        Observation.superseded_by.is_(None)
    ).order_by(Observation.measured_at.desc()).first()
    
    latest_weight = db.query(Observation).filter(
        Observation.patient_id == patient_id,
        Observation.type == "weight",
        Observation.superseded_by.is_(None)
    ).order_by(Observation.measured_at.desc()).first()
    
    latest_hba1c = db.query(Observation).filter(
        Observation.patient_id == patient_id,
        Observation.type == "hba1c",
        Observation.superseded_by.is_(None)
    ).order_by(Observation.measured_at.desc()).first()
    
    def format_obs(obs):
        if not obs:
            return None
        return {
            "value": float(obs.value),
            "value_secondary": float(obs.value_secondary) if obs.value_secondary else None,
            "unit": obs.unit,
            "measured_at": obs.measured_at.isoformat(),
            "context": obs.context
        }
    
    # ── Glucose trend (last 7 days) ──
    glucose_trend = db.query(Observation).filter(
        Observation.patient_id == patient_id,
        Observation.type == "glucose",
        Observation.measured_at >= seven_days_ago,
        Observation.superseded_by.is_(None)
    ).order_by(Observation.measured_at.asc()).all()
    
    # ── Medication adherence (7 days) ──
    active_rx = db.query(Prescription).filter(
        Prescription.patient_id == patient_id,
        Prescription.status == "active"
    ).all()
    
    total_doses = 0
    taken_doses = 0
    missed_doses = 0
    
    for rx in active_rx:
        for item in rx.items:
            instances = db.query(DoseInstance).filter(
                DoseInstance.prescription_item_id == item.id,
                DoseInstance.scheduled_time >= seven_days_ago,
                DoseInstance.scheduled_time <= now,
                DoseInstance.status != "cancelled"
            ).all()
            for inst in instances:
                total_doses += 1
                if inst.status == "taken":
                    taken_doses += 1
                elif inst.status == "missed":
                    missed_doses += 1
    
    adherence = round(taken_doses / total_doses * 100, 1) if total_doses > 0 else None
    
    # ── Today's schedule ──
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1)
    
    todays_doses = []
    for rx in active_rx:
        for item in rx.items:
            instances = db.query(DoseInstance).filter(
                DoseInstance.prescription_item_id == item.id,
                DoseInstance.scheduled_time >= today_start,
                DoseInstance.scheduled_time < today_end,
                DoseInstance.status != "cancelled"
            ).order_by(DoseInstance.scheduled_time).all()
            for inst in instances:
                todays_doses.append({
                    "id": inst.id,
                    "medicine_name": item.medicine_name,
                    "dose": item.dose,
                    "scheduled_time": inst.scheduled_time.isoformat(),
                    "status": inst.status
                })
    
    # ── Upcoming screening tasks ──
    upcoming_screenings = db.query(ScreeningTask).filter(
        ScreeningTask.patient_id == patient_id,
        ScreeningTask.status == "due"
    ).order_by(ScreeningTask.due_date).limit(5).all()
    
    # ── Open care tickets ──
    open_tickets = db.query(Ticket).filter(
        Ticket.patient_id == patient_id,
        Ticket.status.notin_(["resolved", "cancelled"])
    ).count()
    
    # ── Recent investigations ──
    recent_investigations = db.query(Investigation).filter(
        Investigation.patient_id == patient_id
    ).order_by(Investigation.created_at.desc()).limit(5).all()
    
    return {
        "patient": {
            "id": patient.id, "name": user.name if user else "",
            "date_of_birth": str(patient.date_of_birth) if patient.date_of_birth else None,
            "blood_type": patient.blood_type
        },
        "latest_readings": {
            "glucose": format_obs(latest_glucose),
            "blood_pressure": format_obs(latest_bp),
            "weight": format_obs(latest_weight),
            "hba1c": format_obs(latest_hba1c)
        },
        "glucose_trend": [{
            "value": float(g.value), "measured_at": g.measured_at.isoformat(),
            "context": g.context
        } for g in glucose_trend],
        "medication": {
            "adherence_percentage": adherence,
            "total_doses": total_doses,
            "taken": taken_doses,
            "missed": missed_doses,
            "unknown": total_doses - taken_doses - missed_doses,
            "todays_schedule": sorted(todays_doses, key=lambda x: x["scheduled_time"])
        },
        "upcoming_screenings": [{
            "id": s.id, "type": s.type, "title": s.title,
            "due_date": str(s.due_date) if s.due_date else None,
            "status": s.status
        } for s in upcoming_screenings],
        "open_care_tickets": open_tickets,
        "recent_investigations": [{
            "id": inv.id, "test_name": inv.test_name,
            "value": inv.value, "unit": inv.unit,
            "collection_date": str(inv.collection_date) if inv.collection_date else None
        } for inv in recent_investigations],
        "active_prescriptions": len(active_rx)
    }


# ── Notifications ────────────────────────────────────────────────────

@router.get("/notifications")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    unread_only: bool = Query(False)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).count()
    
    return {
        "notifications": [{
            "id": n.id, "type": n.type, "title": n.title,
            "content": n.content, "read": n.read,
            "reference_type": n.reference_type,
            "reference_id": n.reference_id,
            "created_at": n.created_at.isoformat() if n.created_at else None
        } for n in notifications],
        "unread_count": unread_count
    }


@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.read = True
    notif.status = "read"
    db.commit()
    return {"message": "Marked as read"}


@router.post("/notifications/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).update({"read": True, "status": "read"})
    db.commit()
    return {"message": "All notifications marked as read"}


# ── Admin: Users list ────────────────────────────────────────────────

@router.get("/admin/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role: str | None = Query(None)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    
    users = query.order_by(User.created_at.desc()).all()
    return {
        "users": [{
            "id": u.id, "email": u.email, "name": u.name,
            "role": u.role, "status": u.status, "verified": u.verified,
            "phone": u.phone,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users]
    }


@router.patch("/admin/users/{user_id}/verify")
def verify_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.verified = True
    user.status = "active"
    db.add(AuditEvent(
        actor_id=current_user.id, action="verify_user",
        record_type="user", record_id=user_id
    ))
    db.commit()
    return {"message": "User verified", "id": user_id}


# ── Screening tasks ─────────────────────────────────────────────────

@router.get("/patients/{patient_id}/screening-tasks")
def list_screening_tasks(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_patient_access(patient_id, current_user, db)
    tasks = db.query(ScreeningTask).filter(
        ScreeningTask.patient_id == patient_id
    ).order_by(ScreeningTask.due_date).all()
    
    return {
        "tasks": [{
            "id": t.id, "type": t.type, "title": t.title,
            "due_date": str(t.due_date) if t.due_date else None,
            "status": t.status,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None
        } for t in tasks]
    }


@router.patch("/screening-tasks/{task_id}")
def update_screening_task(
    task_id: str,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(ScreeningTask).filter(ScreeningTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = status
    if status == "completed":
        task.completed_at = datetime.now(timezone.utc)
    
    db.commit()
    return {"message": "Task updated", "status": status}


# ── Investigations ───────────────────────────────────────────────────

@router.get("/patients/{patient_id}/investigations")
def list_investigations(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_patient_access(patient_id, current_user, db)
    investigations = db.query(Investigation).filter(
        Investigation.patient_id == patient_id
    ).order_by(Investigation.created_at.desc()).all()
    
    return {
        "investigations": [{
            "id": inv.id, "test_name": inv.test_name,
            "value": inv.value, "unit": inv.unit,
            "collection_date": str(inv.collection_date) if inv.collection_date else None,
            "source": inv.source, "reference_range": inv.reference_range,
            "notes": inv.notes
        } for inv in investigations]
    }
