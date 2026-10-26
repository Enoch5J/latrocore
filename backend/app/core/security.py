import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
import jwt
from app.core.config import settings

COMMON_PASSWORDS_BLACKLIST = {
    "password1234", "password12345", "123456789012", "qwertyuiop12", "letmein12345",
    "welcome12345", "admin1234567", "administrator", "iloveyou1234", "monkey123456",
    "sunshine1234", "princess1234", "football1234", "charlie12345", "shadow123456",
    "trustno11234", "latrocore1234", "diabetes1234", "medical12345", "doctor123456",
    "patient12345", "hospital1234", "healthcare12"
}


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Enforce enterprise password policy:
    1. Between 12 and 128 characters.
    2. Allows spaces, paste, and password managers.
    3. Rejects trivial repetitive strings or common compromised passwords.
    """
    if not password or len(password) < 12:
        return False, "Password must be at least 12 characters long."
    if len(password) > 128:
        return False, "Password must not exceed 128 characters."
    
    # Reject common passwords
    cleaned = password.lower().strip()
    if cleaned in COMMON_PASSWORDS_BLACKLIST:
        return False, "This password is too common and easily compromised. Please choose a more unique passphrase."
    
    # Reject identical repeating character sequences like 'aaaaaaaaaaaa'
    if len(set(password)) <= 2:
        return False, "Password contains too few unique characters. Please use a more varied passphrase."
        
    return True, ""


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def hash_otp(otp: str, email: str, purpose: str) -> str:
    """
    Keyed HMAC-SHA256 hash of OTP bound to email and purpose.
    Ensures OTP cannot be forged, brute-forced offline, or swapped between signup and reset.
    """
    key = settings.JWT_SECRET.encode("utf-8")
    msg = f"{email.lower().strip()}:{purpose.lower().strip()}:{otp.strip()}".encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


def verify_otp_hash(otp: str, stored_hash: str, email: str, purpose: str) -> bool:
    """Constant-time verification of OTP against stored HMAC hash."""
    expected = hash_otp(otp, email, purpose)
    return hmac.compare_digest(expected, stored_hash)

# Argon2id password hasher with recommended secure parameters
# m=65536 (64 MiB), t=3 (iterations), p=4 (parallelism)
_password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16
)


def ensure_utc(dt: datetime | None) -> datetime | None:
    """Normalize datetime to UTC-aware datetime."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return _password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify an Argon2id password hash in constant time."""
    try:
        return _password_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def generate_refresh_token() -> str:
    """Generate a cryptographically secure random string (64 url-safe bytes)."""
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    """Compute SHA-256 digest of refresh token for database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: str, session_id: str, role: str = "user") -> tuple[str, int]:
    """
    Generate short-lived signed JWT access token.
    Claims: sub (user_id), sid (session_id), role, iss, aud, iat, exp.
    Returns (token_string, expires_in_seconds).
    """
    now = datetime.now(timezone.utc)
    expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # 900 seconds (15 minutes)
    exp = now + timedelta(seconds=expires_in_seconds)
    
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "role": str(role),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp())
    }
    
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_in_seconds


def decode_access_token(token: str) -> dict:
    """
    Validate signature, algorithm, expiry, issuer, and audience of an access token.
    Raises PyJWTError or exceptions on failure.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
        issuer=settings.JWT_ISSUER,
        audience=settings.JWT_AUDIENCE,
        options={
            "require": ["sub", "sid", "exp", "iss", "aud", "iat"],
            "verify_signature": True,
            "verify_exp": True,
            "verify_iss": True,
            "verify_aud": True,
        }
    )
