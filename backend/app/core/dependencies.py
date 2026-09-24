from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import User

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate the current user from the JWT bearer token."""
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    if user.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    
    return user


def require_role(*roles: str):
    """Dependency factory that restricts access to specified roles."""
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker


def check_patient_access(patient_id: str, user: User, db: Session):
    """Verify the user has assignment-based access to a specific patient."""
    from app.models.models import Assignment, Patient
    
    # Patients can access their own record
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    
    if user.role == "patient" and patient.user_id == user.id:
        return patient
    
    # Staff must have an active assignment
    if user.role in ("doctor", "care_team"):
        from datetime import date
        assignment = db.query(Assignment).filter(
            Assignment.patient_id == patient_id,
            Assignment.user_id == user.id,
            Assignment.start_date <= date.today(),
            (Assignment.end_date.is_(None)) | (Assignment.end_date >= date.today())
        ).first()
        if assignment:
            return patient
    
    # Admin with explicit purpose (restricted)
    if user.role == "admin":
        return patient
    
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this patient")
