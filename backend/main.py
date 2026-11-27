"""
LATROCORE — FastAPI application entry point.
Secure Authentication Engine with Argon2id, Silent Refresh & CSRF Protection.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.core.config import settings, validate_security_settings
from app.core.database import engine, Base, get_db, init_db_schema
from app.api.v1.router import api_router
from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.dashboard import get_dashboard_data
from app.core.dependencies import get_current_user, check_patient_access
from app.models.models import User, Patient, Attachment, PrescriptionUpload
from sqlalchemy.orm import Session


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Enforce startup security checks
    validate_security_settings()
    # Initialize tables
    Base.metadata.create_all(bind=engine)
    init_db_schema()
    try:
        from app.seeders.seed import seed
        seed()
    except Exception as e:
        print(f"[STARTUP] Seeding check: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-security enterprise authentication system with Argon2id and Silent Refresh",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Strict CORS: Explicit allowed origins & regex. NEVER wildcard with credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=settings.ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"],
    expose_headers=["Retry-After"]
)


# Security Headers Middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    # Ensure sensitive auth endpoints never get cached
    if request.url.path.startswith("/auth") or request.url.path.startswith(f"{settings.API_V1_PREFIX}/auth"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Mount Auth and Admin directly at /auth and /admin to satisfy exact specification
app.include_router(auth_router)
app.include_router(admin_router)


@app.get("/dashboard")
def dashboard_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_dashboard_data(db=db, current_user=current_user)


# Also mount full API under /api/v1
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Authenticated & ownership-checked access for uploaded prescription files
os.makedirs("uploads/prescriptions", exist_ok=True)


@app.get("/uploads/{file_path:path}")
def get_uploaded_file(
    file_path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve uploaded files only to the owning patient or authorized clinician/admin."""
    uploads_root = os.path.realpath("uploads")
    target_path = os.path.realpath(os.path.join(uploads_root, file_path))
    if not (target_path == uploads_root or target_path.startswith(uploads_root + os.sep)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid file path")

    normalized_url = f"/uploads/{file_path.lstrip('/')}"
    upload_rec = db.query(PrescriptionUpload).filter(PrescriptionUpload.file_url == normalized_url).first()
    attachment_rec = db.query(Attachment).filter(Attachment.file_path == normalized_url).first()
    owner_patient = db.query(Patient).filter(Patient.prescription_file_url == normalized_url).first()

    owner_patient_id = (
        (upload_rec.patient_id if upload_rec else None)
        or (attachment_rec.patient_id if attachment_rec else None)
        or (owner_patient.id if owner_patient else None)
    )
    owner_user_id = (
        (upload_rec.user_id if upload_rec else None)
        or (attachment_rec.uploaded_by if attachment_rec else None)
        or (owner_patient.user_id if owner_patient else None)
    )

    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        is_owner = (
            (owner_user_id and owner_user_id == current_user.id)
            or (patient and owner_patient_id and owner_patient_id == patient.id)
        )
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this prescription file",
            )
    elif current_user.role in ("doctor", "pharmacist", "care_team"):
        if not owner_patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this file")
        check_patient_access(owner_patient_id, current_user, db)
    elif current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if not os.path.isfile(target_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uploaded file not found")

    return FileResponse(target_path)


@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "name": "LATROCORE Enterprise Auth API",
        "version": "1.0.0",
        "security": "Argon2id + Silent Refresh + CSRF Shield",
        "docs": "/docs"
    }


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

