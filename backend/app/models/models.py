"""
LATROCORE — All SQLAlchemy models for MySQL.
22 tables covering the complete diabetes care data model.
"""

import uuid
from datetime import datetime, timezone, date
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, Date, DateTime,
    ForeignKey, Enum, Numeric, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


# ─── 1. Organizations ───────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="clinic")  # clinic, hospital, pharmacy
    created_at = Column(DateTime, default=utcnow)
    
    users = relationship("User", back_populates="organization")


# ─── 2. Users ────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum("patient", "doctor", "care_team", "admin", name="user_role"), nullable=False)
    status = Column(Enum("active", "pending", "suspended", name="user_status"), default="active")
    verified = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, default=False)
    org_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    organization = relationship("Organization", back_populates="users")
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    assignments = relationship("Assignment", foreign_keys="Assignment.user_id", back_populates="user")


# ─── 3. Memberships ─────────────────────────────────────────────────

class Membership(Base):
    __tablename__ = "memberships"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    org_id = Column(String(36), ForeignKey("organizations.id"), nullable=False)
    role = Column(String(50), nullable=False)
    status = Column(Enum("active", "inactive", name="membership_status"), default="active")
    created_at = Column(DateTime, default=utcnow)


# ─── 4. Patients ────────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_type = Column(String(10), nullable=True)
    language = Column(String(10), default="en")
    timezone = Column(String(50), default="Asia/Kolkata")
    allergies = Column(Text, nullable=True)  # JSON string
    conditions = Column(Text, nullable=True)  # JSON string
    medicine_history = Column(Text, nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    user = relationship("User", back_populates="patient_profile")
    assignments = relationship("Assignment", back_populates="patient")
    observations = relationship("Observation", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    screening_tasks = relationship("ScreeningTask", back_populates="patient")
    referrals = relationship("Referral", back_populates="patient")
    conversations = relationship("Conversation", back_populates="patient")
    investigations = relationship("Investigation", back_populates="patient")


# ─── 5. Assignments ─────────────────────────────────────────────────

class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), nullable=False)  # doctor, pharmacist, care_team
    org_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    assigned_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    patient = relationship("Patient", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id], back_populates="assignments")

    __table_args__ = (
        Index("ix_assignment_patient_user", "patient_id", "user_id"),
    )


# ─── 6. Consents ────────────────────────────────────────────────────

class Consent(Base):
    __tablename__ = "consents"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    purpose = Column(String(100), nullable=False)
    version = Column(String(20), nullable=False)
    granted_at = Column(DateTime, default=utcnow)
    withdrawn_at = Column(DateTime, nullable=True)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)


# ─── 7. Care Plans ──────────────────────────────────────────────────

class CarePlan(Base):
    __tablename__ = "care_plans"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    version = Column(Integer, default=1)
    rules = Column(Text, nullable=True)  # JSON of clinical rules
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    created_at = Column(DateTime, default=utcnow)


# ─── 8. Prescriptions ───────────────────────────────────────────────

class Prescription(Base):
    __tablename__ = "prescriptions"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    prescriber_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(Enum("draft", "active", "superseded", "discontinued", name="rx_status"), default="draft")
    version = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    activated_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    patient = relationship("Patient", back_populates="prescriptions")
    prescriber = relationship("User", foreign_keys=[prescriber_id])
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


# ─── 9. Prescription Items ──────────────────────────────────────────

class PrescriptionItem(Base):
    __tablename__ = "prescription_items"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    prescription_id = Column(String(36), ForeignKey("prescriptions.id"), nullable=False)
    medicine_name = Column(String(255), nullable=False)
    strength = Column(String(100), nullable=True)
    dose = Column(String(100), nullable=False)
    unit = Column(String(50), nullable=True)
    route = Column(String(50), default="oral")  # oral, injection, topical
    frequency = Column(String(100), nullable=False)  # e.g. "twice daily"
    schedule_times = Column(Text, nullable=True)  # JSON: ["08:00","20:00"]
    food_instructions = Column(String(255), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_prn = Column(Boolean, default=False)  # as-needed
    created_at = Column(DateTime, default=utcnow)
    
    prescription = relationship("Prescription", back_populates="items")
    dose_instances = relationship("DoseInstance", back_populates="prescription_item")


# ─── 10. Dose Instances ─────────────────────────────────────────────

class DoseInstance(Base):
    __tablename__ = "dose_instances"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    prescription_item_id = Column(String(36), ForeignKey("prescription_items.id"), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(Enum("pending", "taken", "missed", "unknown", "cancelled", name="dose_status"), default="pending")
    created_at = Column(DateTime, default=utcnow)
    
    prescription_item = relationship("PrescriptionItem", back_populates="dose_instances")
    events = relationship("DoseEvent", back_populates="dose_instance")
    
    __table_args__ = (
        UniqueConstraint("prescription_item_id", "scheduled_time", name="uq_dose_item_time"),
        Index("ix_dose_scheduled", "scheduled_time"),
    )


# ─── 11. Dose Events ────────────────────────────────────────────────

class DoseEvent(Base):
    __tablename__ = "dose_events"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    dose_instance_id = Column(String(36), ForeignKey("dose_instances.id"), nullable=False)
    event_time = Column(DateTime, nullable=False)
    status = Column(Enum("taken", "missed", "skipped", name="event_status"), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)
    correction_of = Column(String(36), nullable=True)  # references prior event
    created_at = Column(DateTime, default=utcnow)
    
    dose_instance = relationship("DoseInstance", back_populates="events")
    actor = relationship("User", foreign_keys=[actor_id])


# ─── 12. Observations ───────────────────────────────────────────────

class Observation(Base):
    __tablename__ = "observations"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # glucose, hba1c, blood_pressure, weight, lifestyle
    value = Column(Numeric(10, 2), nullable=False)
    value_secondary = Column(Numeric(10, 2), nullable=True)  # diastolic for BP
    unit = Column(String(20), nullable=False)
    measured_at = Column(DateTime, nullable=False)
    entry_time = Column(DateTime, default=utcnow)
    context = Column(String(50), nullable=True)  # fasting, pre_meal, post_meal, random
    meal_interval = Column(Integer, nullable=True)  # minutes since meal
    symptoms = Column(Text, nullable=True)
    activity = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(String(50), default="manual")  # manual, imported, device
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    superseded_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    patient = relationship("Patient", back_populates="observations")
    
    __table_args__ = (
        Index("ix_obs_patient_time", "patient_id", "measured_at"),
    )


# ─── 13. Investigations ─────────────────────────────────────────────

class Investigation(Base):
    __tablename__ = "investigations"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    test_name = Column(String(255), nullable=False)
    value = Column(String(100), nullable=True)
    unit = Column(String(50), nullable=True)
    collection_date = Column(Date, nullable=True)
    source = Column(String(100), nullable=True)
    reference_range = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    patient = relationship("Patient", back_populates="investigations")
    attachments = relationship("Attachment", back_populates="investigation")


# ─── 14. Attachments ────────────────────────────────────────────────

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    investigation_id = Column(String(36), ForeignKey("investigations.id"), nullable=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    scan_status = Column(Enum("pending", "clean", "quarantined", name="scan_status"), default="pending")
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)
    
    investigation = relationship("Investigation", back_populates="attachments")


# ─── 15. Screening Tasks ────────────────────────────────────────────

class ScreeningTask(Base):
    __tablename__ = "screening_tasks"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    type = Column(String(100), nullable=False)  # eye, foot, kidney, cardiovascular, oral, vaccination
    title = Column(String(255), nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(Enum("due", "completed", "deferred", "cancelled", name="screening_status"), default="due")
    completed_at = Column(DateTime, nullable=True)
    evidence = Column(Text, nullable=True)
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    patient = relationship("Patient", back_populates="screening_tasks")


# ─── 16. Referrals ──────────────────────────────────────────────────

class Referral(Base):
    __tablename__ = "referrals"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    requester_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    purpose = Column(String(255), nullable=False)
    service = Column(String(100), nullable=True)
    context = Column(Text, nullable=True)
    status = Column(Enum("open", "assigned", "in_progress", "resolved", "cancelled", name="referral_status"), default="open")
    created_at = Column(DateTime, default=utcnow)
    
    patient = relationship("Patient", back_populates="referrals")
    requester = relationship("User", foreign_keys=[requester_id])
    tickets = relationship("Ticket", back_populates="referral")


# ─── 17. Tickets ────────────────────────────────────────────────────

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    referral_id = Column(String(36), ForeignKey("referrals.id"), nullable=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    assignee_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(Enum("open", "assigned", "in_progress", "awaiting_patient", "escalated", "resolved", "cancelled", name="ticket_status"), default="open")
    type = Column(String(50), default="counselling")  # counselling, follow_up
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    referral = relationship("Referral", back_populates="tickets")
    notes = relationship("Note", back_populates="ticket")

    __table_args__ = (
        Index("ix_ticket_assignee_status", "assignee_id", "status"),
    )


# ─── 18. Notes ───────────────────────────────────────────────────────

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    ticket_id = Column(String(36), ForeignKey("tickets.id"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(Enum("shared", "internal", name="note_type"), default="shared")
    follow_up_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    ticket = relationship("Ticket", back_populates="notes")
    author = relationship("User", foreign_keys=[author_id])


# ─── 19. Conversations ──────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    language = Column(String(10), default="en")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    patient = relationship("Patient", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")


# ─── 20. Messages ───────────────────────────────────────────────────

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    role = Column(Enum("user", "assistant", "system", name="message_role"), nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(Text, nullable=True)  # JSON references
    model_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")


# ─── 21. Notifications ──────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # dose_reminder, referral, ticket_update, alert
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    read = Column(Boolean, default=False)
    channel = Column(String(20), default="in_app")
    status = Column(Enum("queued", "sent", "delivered", "failed", "read", name="notif_status"), default="queued")
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    __table_args__ = (
        Index("ix_notif_user_read", "user_id", "read"),
    )


# ─── 22. Audit Events ───────────────────────────────────────────────

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(String(36), primary_key=True, default=gen_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    record_type = Column(String(50), nullable=True)
    record_id = Column(String(36), nullable=True)
    details = Column(Text, nullable=True)  # JSON
    reason = Column(Text, nullable=True)
    request_id = Column(String(36), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    __table_args__ = (
        Index("ix_audit_actor_time", "actor_id", "created_at"),
    )
