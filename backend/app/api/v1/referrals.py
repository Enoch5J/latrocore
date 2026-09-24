"""Referral, ticket and note routes for care coordination."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_patient_access, require_role
from app.models.models import (
    User, Referral, Ticket, Note, Notification, AuditEvent
)

router = APIRouter(tags=["Care Coordination"])


# ── Schemas ──────────────────────────────────────────────────────────

class ReferralCreate(BaseModel):
    purpose: str
    service: str | None = None
    context: str | None = None


class TicketCreate(BaseModel):
    type: str = "counselling"
    context: str | None = None


class TicketUpdate(BaseModel):
    status: str | None = None
    assignee_id: str | None = None
    due_date: date | None = None
    reason: str | None = None


class NoteCreate(BaseModel):
    content: str
    type: str = "shared"  # shared or internal
    follow_up_action: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/patients/{patient_id}/referrals", status_code=201)
def create_referral(
    patient_id: str,
    data: ReferralCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor"))
):
    check_patient_access(patient_id, current_user, db)
    
    referral = Referral(
        patient_id=patient_id,
        requester_id=current_user.id,
        purpose=data.purpose,
        service=data.service,
        context=data.context,
        status="open"
    )
    db.add(referral)
    db.flush()
    
    # Auto-create a ticket for this referral
    ticket = Ticket(
        referral_id=referral.id,
        patient_id=patient_id,
        status="open",
        type="counselling"
    )
    db.add(ticket)
    
    db.add(AuditEvent(
        actor_id=current_user.id, action="create_referral",
        record_type="referral", record_id=referral.id
    ))
    db.commit()
    
    return {"message": "Referral created", "referral_id": referral.id, "ticket_id": ticket.id}


@router.get("/patients/{patient_id}/referrals")
def list_referrals(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_patient_access(patient_id, current_user, db)
    
    referrals = db.query(Referral).filter(Referral.patient_id == patient_id).order_by(Referral.created_at.desc()).all()
    results = []
    for r in referrals:
        requester = db.query(User).filter(User.id == r.requester_id).first()
        tickets = db.query(Ticket).filter(Ticket.referral_id == r.id).all()
        results.append({
            "id": r.id, "purpose": r.purpose, "service": r.service,
            "context": r.context, "status": r.status,
            "requester_name": requester.name if requester else "",
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "tickets": [{"id": t.id, "status": t.status, "type": t.type} for t in tickets]
        })
    
    return {"referrals": results}


@router.post("/patients/{patient_id}/tickets", status_code=201)
def create_ticket(
    patient_id: str,
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_patient_access(patient_id, current_user, db)
    
    ticket = Ticket(
        patient_id=patient_id,
        status="open",
        type=data.type
    )
    db.add(ticket)
    db.add(AuditEvent(
        actor_id=current_user.id, action="create_ticket",
        record_type="ticket", record_id=ticket.id
    ))
    db.commit()
    
    return {"message": "Ticket created", "id": ticket.id}


@router.get("/tickets")
def list_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: str | None = None
):
    """List tickets — care team sees assigned, admin sees all."""
    query = db.query(Ticket)
    
    if current_user.role == "care_team":
        query = query.filter(
            (Ticket.assignee_id == current_user.id) | (Ticket.assignee_id.is_(None))
        )
    elif current_user.role == "patient":
        from app.models.models import Patient
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            query = query.filter(Ticket.patient_id == patient.id)
    
    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    
    tickets = query.order_by(Ticket.created_at.desc()).all()
    results = []
    for t in tickets:
        from app.models.models import Patient
        patient = db.query(Patient).filter(Patient.id == t.patient_id).first()
        patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient else None
        assignee = db.query(User).filter(User.id == t.assignee_id).first() if t.assignee_id else None
        
        notes_list = []
        for n in t.notes:
            author = db.query(User).filter(User.id == n.author_id).first()
            # Hide internal notes from patients
            if current_user.role == "patient" and n.type == "internal":
                continue
            notes_list.append({
                "id": n.id, "content": n.content, "type": n.type,
                "author_name": author.name if author else "",
                "follow_up_action": n.follow_up_action,
                "created_at": n.created_at.isoformat() if n.created_at else None
            })
        
        results.append({
            "id": t.id, "status": t.status, "type": t.type,
            "patient_id": t.patient_id,
            "patient_name": patient_user.name if patient_user else "",
            "assignee_name": assignee.name if assignee else "Unassigned",
            "assignee_id": t.assignee_id,
            "due_date": str(t.due_date) if t.due_date else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "notes": notes_list
        })
    
    return {"tickets": results}


@router.patch("/tickets/{ticket_id}")
def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    valid_transitions = {
        "open": ["assigned", "cancelled"],
        "assigned": ["in_progress", "cancelled"],
        "in_progress": ["awaiting_patient", "escalated", "resolved"],
        "awaiting_patient": ["in_progress", "resolved"],
        "escalated": ["in_progress", "resolved"],
        "resolved": ["open"],  # reopen
    }
    
    if data.status:
        allowed = valid_transitions.get(ticket.status, [])
        if data.status not in allowed:
            raise HTTPException(status_code=422, detail=f"Cannot transition from '{ticket.status}' to '{data.status}'")
        ticket.status = data.status
    
    if data.assignee_id:
        ticket.assignee_id = data.assignee_id
        if ticket.status == "open":
            ticket.status = "assigned"
    
    if data.due_date:
        ticket.due_date = data.due_date
    
    # Create notification for patient
    from app.models.models import Patient
    patient = db.query(Patient).filter(Patient.id == ticket.patient_id).first()
    if patient:
        db.add(Notification(
            user_id=patient.user_id,
            type="ticket_update",
            title="Care ticket updated",
            content=f"Your {ticket.type} ticket status: {ticket.status}",
            reference_type="ticket",
            reference_id=ticket.id
        ))
    
    db.add(AuditEvent(
        actor_id=current_user.id, action="update_ticket",
        record_type="ticket", record_id=ticket_id,
        reason=data.reason
    ))
    db.commit()
    
    return {"message": "Ticket updated", "id": ticket.id, "status": ticket.status}


@router.post("/tickets/{ticket_id}/notes", status_code=201)
def add_note(
    ticket_id: str,
    data: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    note = Note(
        ticket_id=ticket_id,
        author_id=current_user.id,
        content=data.content,
        type=data.type,
        follow_up_action=data.follow_up_action
    )
    db.add(note)
    db.add(AuditEvent(
        actor_id=current_user.id, action="add_note",
        record_type="note", record_id=note.id
    ))
    db.commit()
    
    return {"message": "Note added", "id": note.id}
