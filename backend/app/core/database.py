from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

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
                
                # Mark existing active users' patients as approved so existing demo data works
                conn.execute(text(
                    "UPDATE patients SET approval_status = 'approved' "
                    "WHERE user_id IN (SELECT id FROM users WHERE status = 'active' AND role = 'patient') "
                    "AND (approval_status IS NULL OR approval_status = 'pending')"
                ))
    except Exception as e:
        print(f"[DB_SCHEMA] Migration check notice: {e}")


def get_db():
    """Dependency that provides a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
