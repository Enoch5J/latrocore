"""
LATROCORE — FastAPI application entry point.
Secure Authentication Engine with Argon2id, Silent Refresh & CSRF Protection.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings, validate_security_settings
from app.core.database import engine, Base, get_db, init_db_schema
from app.api.v1.router import api_router
from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.dashboard import get_dashboard_data
from app.core.dependencies import get_current_user
from app.models.models import User
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

# Static file serving for uploaded prescriptions
os.makedirs("uploads/prescriptions", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


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

