from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.models import RateLimitAttempt
from app.core.config import settings
from app.core.security import ensure_utc


def get_or_create_attempt_record(db: Session, key: str) -> RateLimitAttempt:
    """Retrieve or create a rate limit attempt record with row lock."""
    # Try locking existing record
    record = db.query(RateLimitAttempt).filter(RateLimitAttempt.key == key).with_for_update().first()
    if record is None:
        record = RateLimitAttempt(
            key=key,
            attempts=0,
            first_attempt_at=datetime.now(timezone.utc),
            locked_until=None
        )
        db.add(record)
        try:
            db.flush()
        except Exception:
            db.rollback()
            record = db.query(RateLimitAttempt).filter(RateLimitAttempt.key == key).with_for_update().first()
    return record


def check_login_rate_limit(db: Session, ip: str, email: str) -> tuple[bool, int]:
    """
    Check if login is rate limited by IP or Account.
    Returns (is_limited: bool, retry_after_seconds: int).
    """
    now = datetime.now(timezone.utc)
    keys = [f"ip:{ip}", f"account:{email.lower().strip()}"]
    
    max_retry_after = 0
    is_limited = False
    
    for key in keys:
        record = db.query(RateLimitAttempt).filter(RateLimitAttempt.key == key).first()
        if record and record.locked_until:
            locked_until = ensure_utc(record.locked_until)
            if locked_until > now:
                is_limited = True
                remaining = int((locked_until - now).total_seconds())
                if remaining > max_retry_after:
                    max_retry_after = remaining
    
    return is_limited, max(max_retry_after, 1 if is_limited else 0)


def record_login_failure(db: Session, ip: str, email: str):
    """
    Record failed login attempt for IP and Account.
    Applies lockout when threshold exceeded.
    """
    now = datetime.now(timezone.utc)
    window = timedelta(minutes=settings.RATE_LIMIT_WINDOW_MINUTES)
    lockout = timedelta(minutes=settings.RATE_LIMIT_LOCKOUT_MINUTES)
    
    targets = [
        (f"ip:{ip}", settings.MAX_LOGIN_ATTEMPTS_PER_IP),
        (f"account:{email.lower().strip()}", settings.MAX_LOGIN_ATTEMPTS_PER_ACCOUNT)
    ]
    
    for key, max_attempts in targets:
        record = get_or_create_attempt_record(db, key)
        first_attempt = ensure_utc(record.first_attempt_at)
        
        # If outside window and not currently locked, reset window counter
        if now - first_attempt > window and (record.locked_until is None or ensure_utc(record.locked_until) <= now):
            record.attempts = 1
            record.first_attempt_at = now
            record.locked_until = None
        else:
            record.attempts += 1
            if record.attempts >= max_attempts:
                record.locked_until = now + lockout
        
    db.commit()


def record_login_success(db: Session, ip: str, email: str):
    """
    Reset account failure count on successful login.
    """
    account_key = f"account:{email.lower().strip()}"
    record = db.query(RateLimitAttempt).filter(RateLimitAttempt.key == account_key).with_for_update().first()
    if record:
        record.attempts = 0
        record.locked_until = None
        record.first_attempt_at = datetime.now(timezone.utc)
        db.commit()
