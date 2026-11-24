from sqlalchemy import create_engine, inspect, text
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

                # Purge synthetic demo users and dummy records
                demo_emails = "('patient@latrocore.com', 'patient2@latrocore.com', 'doctor@latrocore.com', 'pharmacist@latrocore.com')"
                try:
                    conn.execute(text(f"DELETE FROM dose_instances WHERE prescription_item_id IN (SELECT id FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE prescriber_id IN (SELECT id FROM users WHERE email IN {demo_emails})))"))
                    conn.execute(text(f"DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE prescriber_id IN (SELECT id FROM users WHERE email IN {demo_emails}))"))
                    conn.execute(text(f"DELETE FROM prescriptions WHERE prescriber_id IN (SELECT id FROM users WHERE email IN {demo_emails})"))
                    conn.execute(text(f"DELETE FROM observations WHERE patient_id IN (SELECT id FROM patients WHERE user_id IN (SELECT id FROM users WHERE email IN {demo_emails}))"))
                    conn.execute(text(f"DELETE FROM screening_tasks WHERE patient_id IN (SELECT id FROM patients WHERE user_id IN (SELECT id FROM users WHERE email IN {demo_emails}))"))
                    conn.execute(text(f"DELETE FROM investigations WHERE patient_id IN (SELECT id FROM patients WHERE user_id IN (SELECT id FROM users WHERE email IN {demo_emails}))"))
                    conn.execute(text(f"DELETE FROM referrals WHERE patient_id IN (SELECT id FROM patients WHERE user_id IN (SELECT id FROM users WHERE email IN {demo_emails}))"))
                    conn.execute(text(f"DELETE FROM tickets WHERE patient_id IN (SELECT id FROM patients WHERE user_id IN (SELECT id FROM users WHERE email IN {demo_emails}))"))
                    conn.execute(text(f"DELETE FROM notes WHERE patient_id IN (SELECT id FROM patients WHERE user_id IN (SELECT id FROM users WHERE email IN {demo_emails}))"))
                    conn.execute(text(f"DELETE FROM assignments WHERE user_id IN (SELECT id FROM users WHERE email IN {demo_emails})"))
                    conn.execute(text(f"DELETE FROM patients WHERE user_id IN (SELECT id FROM users WHERE email IN {demo_emails})"))
                    conn.execute(text("DELETE FROM doctor_profiles WHERE user_id IN (SELECT id FROM users WHERE email = 'doctor@latrocore.com')"))
                    conn.execute(text("DELETE FROM pharmacist_profiles WHERE user_id IN (SELECT id FROM users WHERE email = 'pharmacist@latrocore.com')"))
                    conn.execute(text(f"DELETE FROM users WHERE email IN {demo_emails}"))
                except Exception as purge_err:
                    print(f"[DB_SCHEMA] Demo purge notice: {purge_err}")
    except Exception as e:
        print(f"[DB_SCHEMA] Migration check notice: {e}")


def get_db():
    """Dependency that provides a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
