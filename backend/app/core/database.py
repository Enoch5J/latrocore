from sqlalchemy import create_engine, inspect, text, func, or_
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Dynamically ensure the requested driver is available or fallback cleanly
if db_url.startswith("postgresql://"):
    try:
        import psycopg2  # noqa: F401
    except ImportError:
        try:
            import psycopg  # noqa: F401
            db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        except ImportError:
            pass
elif db_url.startswith("postgresql+psycopg://"):
    try:
        import psycopg  # noqa: F401
    except ImportError:
        try:
            import psycopg2  # noqa: F401
            db_url = db_url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
        except ImportError:
            pass
elif db_url.startswith("postgresql+psycopg2://"):
    try:
        import psycopg2  # noqa: F401
    except ImportError:
        try:
            import psycopg  # noqa: F401
            db_url = db_url.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
        except ImportError:
            pass

# Handle dialect-specific connection arguments
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


DUMMY_PATIENT_EMAILS = ("patient@latrocore.com", "patient2@latrocore.com")


def delete_users_with_records(db, user_ids: list[str]) -> int:
    """Delete specified users and all dependent clinical/auth records in FK-safe order."""
    if not user_ids:
        return 0

    from app.models.models import (
        User, Patient, DoctorProfile, PharmacistProfile, Membership,
        Assignment, Consent, CarePlan, Prescription, PrescriptionItem,
        DoseInstance, DoseEvent, Observation, Investigation, Attachment,
        PrescriptionUpload, ScreeningTask, Referral, Ticket, Note,
        Conversation, Message, Notification, AuditEvent,
        Session as UserSession, RefreshToken
    )

    patient_ids = [
        row[0] for row in db.query(Patient.id).filter(Patient.user_id.in_(user_ids)).all()
    ]

    rx_filter = Prescription.prescriber_id.in_(user_ids)
    if patient_ids:
        rx_filter = or_(rx_filter, Prescription.patient_id.in_(patient_ids))
    rx_ids = [row[0] for row in db.query(Prescription.id).filter(rx_filter).all()]

    if rx_ids:
        item_ids = [
            row[0] for row in db.query(PrescriptionItem.id).filter(
                PrescriptionItem.prescription_id.in_(rx_ids)
            ).all()
        ]
        if item_ids:
            dose_inst_ids = [
                row[0] for row in db.query(DoseInstance.id).filter(
                    DoseInstance.prescription_item_id.in_(item_ids)
                ).all()
            ]
            if dose_inst_ids:
                db.query(DoseEvent).filter(
                    DoseEvent.dose_instance_id.in_(dose_inst_ids)
                ).delete(synchronize_session=False)
            db.query(DoseInstance).filter(
                DoseInstance.prescription_item_id.in_(item_ids)
            ).delete(synchronize_session=False)
            db.query(PrescriptionItem).filter(
                PrescriptionItem.prescription_id.in_(rx_ids)
            ).delete(synchronize_session=False)
        db.query(Prescription).filter(Prescription.id.in_(rx_ids)).delete(synchronize_session=False)

    db.query(DoseEvent).filter(DoseEvent.actor_id.in_(user_ids)).delete(synchronize_session=False)

    if patient_ids:
        db.query(CarePlan).filter(CarePlan.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(Consent).filter(Consent.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(PrescriptionUpload).filter(PrescriptionUpload.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(Attachment).filter(Attachment.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(Investigation).filter(Investigation.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(Observation).filter(Observation.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(ScreeningTask).filter(ScreeningTask.patient_id.in_(patient_ids)).delete(synchronize_session=False)

        ticket_ids = [
            row[0] for row in db.query(Ticket.id).filter(Ticket.patient_id.in_(patient_ids)).all()
        ]
        if ticket_ids:
            db.query(Note).filter(Note.ticket_id.in_(ticket_ids)).delete(synchronize_session=False)
            db.query(Ticket).filter(Ticket.id.in_(ticket_ids)).delete(synchronize_session=False)

        db.query(Referral).filter(Referral.patient_id.in_(patient_ids)).delete(synchronize_session=False)

        pat_convo_ids = [
            row[0] for row in db.query(Conversation.id).filter(
                Conversation.patient_id.in_(patient_ids)
            ).all()
        ]
        if pat_convo_ids:
            db.query(Message).filter(Message.conversation_id.in_(pat_convo_ids)).delete(synchronize_session=False)
            db.query(Conversation).filter(Conversation.id.in_(pat_convo_ids)).delete(synchronize_session=False)

        db.query(Assignment).filter(Assignment.patient_id.in_(patient_ids)).delete(synchronize_session=False)
        db.query(Patient).filter(Patient.id.in_(patient_ids)).delete(synchronize_session=False)

    db.query(CarePlan).filter(CarePlan.author_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(Consent).filter(Consent.actor_id.in_(user_ids)).update({Consent.actor_id: None}, synchronize_session=False)
    db.query(PrescriptionUpload).filter(PrescriptionUpload.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(Attachment).filter(Attachment.uploaded_by.in_(user_ids)).delete(synchronize_session=False)
    db.query(Observation).filter(Observation.actor_id.in_(user_ids)).update({Observation.actor_id: None}, synchronize_session=False)
    db.query(ScreeningTask).filter(ScreeningTask.assigned_to.in_(user_ids)).update({ScreeningTask.assigned_to: None}, synchronize_session=False)
    db.query(Note).filter(Note.author_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(Ticket).filter(Ticket.assignee_id.in_(user_ids)).update({Ticket.assignee_id: None}, synchronize_session=False)

    req_ref_ids = [row[0] for row in db.query(Referral.id).filter(Referral.requester_id.in_(user_ids)).all()]
    if req_ref_ids:
        ref_ticket_ids = [row[0] for row in db.query(Ticket.id).filter(Ticket.referral_id.in_(req_ref_ids)).all()]
        if ref_ticket_ids:
            db.query(Note).filter(Note.ticket_id.in_(ref_ticket_ids)).delete(synchronize_session=False)
            db.query(Ticket).filter(Ticket.id.in_(ref_ticket_ids)).delete(synchronize_session=False)
        db.query(Referral).filter(Referral.id.in_(req_ref_ids)).delete(synchronize_session=False)

    user_convo_ids = [
        row[0] for row in db.query(Conversation.id).filter(Conversation.user_id.in_(user_ids)).all()
    ]
    if user_convo_ids:
        db.query(Message).filter(Message.conversation_id.in_(user_convo_ids)).delete(synchronize_session=False)
        db.query(Conversation).filter(Conversation.id.in_(user_convo_ids)).delete(synchronize_session=False)

    db.query(Assignment).filter(Assignment.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(Assignment).filter(Assignment.assigned_by.in_(user_ids)).update({Assignment.assigned_by: None}, synchronize_session=False)
    db.query(Patient).filter(Patient.approved_by.in_(user_ids)).update({Patient.approved_by: None}, synchronize_session=False)
    db.query(DoctorProfile).filter(DoctorProfile.approved_by.in_(user_ids)).update({DoctorProfile.approved_by: None}, synchronize_session=False)
    db.query(PharmacistProfile).filter(PharmacistProfile.approved_by.in_(user_ids)).update({PharmacistProfile.approved_by: None}, synchronize_session=False)
    db.query(DoctorProfile).filter(DoctorProfile.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(PharmacistProfile).filter(PharmacistProfile.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(Membership).filter(Membership.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(AuditEvent).filter(AuditEvent.actor_id.in_(user_ids)).delete(synchronize_session=False)

    session_ids = [
        row[0] for row in db.query(UserSession.id).filter(UserSession.user_id.in_(user_ids)).all()
    ]
    if session_ids:
        db.query(RefreshToken).filter(RefreshToken.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(UserSession).filter(UserSession.id.in_(session_ids)).delete(synchronize_session=False)

    deleted_count = db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
    return deleted_count


def purge_dummy_patient_accounts(db) -> int:
    """Remove synthetic dummy patient portal emails and their mock records, keeping staff & real users."""
    from app.models.models import User

    dummy_user_ids = [
        row[0] for row in db.query(User.id).filter(
            func.lower(User.email).in_(DUMMY_PATIENT_EMAILS)
        ).all()
    ]
    if not dummy_user_ids:
        return 0
    return delete_users_with_records(db, dummy_user_ids)


def init_db_schema():
    """Ensure database schema has all needed approval columns across dialects."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "patients" in tables:
            columns = [c["name"] for c in inspector.get_columns("patients")]
            with engine.begin() as conn:
                is_pg = engine.dialect.name == "postgresql"
                dt_type = "TIMESTAMP" if is_pg else "DATETIME"
                if "approval_status" not in columns:
                    conn.execute(text("ALTER TABLE patients ADD COLUMN approval_status VARCHAR(50) DEFAULT 'pending'"))
                if "rejection_reason" not in columns:
                    conn.execute(text("ALTER TABLE patients ADD COLUMN rejection_reason TEXT"))
                if "approved_by" not in columns:
                    conn.execute(text("ALTER TABLE patients ADD COLUMN approved_by VARCHAR(36)"))
                if "approved_at" not in columns:
                    conn.execute(text(f"ALTER TABLE patients ADD COLUMN approved_at {dt_type}"))

                # Auto-approve all patient accounts (patients do not require administrative approval)
                conn.execute(text(
                    "UPDATE users SET status = 'active' WHERE role = 'patient' AND status = 'pending'"
                ))
                conn.execute(text(
                    "UPDATE patients SET approval_status = 'approved' "
                    "WHERE approval_status IS NULL OR approval_status = 'pending'"
                ))

        if "users" in tables:
            db = SessionLocal()
            try:
                removed = purge_dummy_patient_accounts(db)
                if removed:
                    db.commit()
                    print(f"[DB_SCHEMA] Removed {removed} dummy patient portal account(s).")
                else:
                    db.rollback()
            except Exception as purge_err:
                db.rollback()
                print(f"[DB_SCHEMA] Dummy patient cleanup notice: {purge_err}")
            finally:
                db.close()
    except Exception as e:
        print(f"[DB_SCHEMA] Migration check notice: {e}")


def get_db():
    """Dependency that provides a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
