from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token, ensure_utc
from app.models.models import User, Session as UserSession

security_scheme = HTTPBearer(auto_error=True)


async def get_current_user_and_session(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> tuple[User, UserSession]:
    """
    Validate signed JWT access token, issuer, audience, expiry, algorithm,
    and verify active session in database.
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("sub")
    session_id = payload.get("sid")
    
    if not user_id or not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # 1. Verify Session is active, not revoked, and not expired
    user_session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not user_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session does not exist",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if user_session.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    now = datetime.now(timezone.utc)
    if ensure_utc(user_session.expires_at) <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # 2. Verify User exists and is active
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is suspended"
        )
    if user.status not in ("active", "pending"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user, user_session


async def get_current_user(
    auth_tuple: tuple[User, UserSession] = Depends(get_current_user_and_session)
) -> User:
    """Dependency returning authenticated active user."""
    user, _ = auth_tuple
    return user


def require_role(*roles: str):
    """Dependency restricting route access to specified roles."""
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


def check_patient_access(patient_id: str, user: User, db: Session):
    """Verify the user has assignment-based access to a specific patient."""
    from app.models.models import Assignment, Patient
    from datetime import date
    
    if user.role == "doctor" and user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your doctor account is pending administrative approval. Access to patient records is restricted."
        )
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    
    if user.role == "patient" and patient.user_id == user.id:
        return patient
    
    if user.role in ("doctor", "care_team"):
        assignment = db.query(Assignment).filter(
            Assignment.patient_id == patient_id,
            Assignment.user_id == user.id,
            Assignment.start_date <= date.today(),
            (Assignment.end_date.is_(None)) | (Assignment.end_date >= date.today())
        ).first()
        if assignment:
            return patient
    
    if user.role == "admin":
        return patient
    
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this patient")
