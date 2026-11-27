import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Search both current working directory and backend directory for .env
load_dotenv()
_backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
if os.path.exists(_backend_env):
    load_dotenv(_backend_env)



class Settings(BaseSettings):
    PROJECT_NAME: str = "LATROCORE"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    # Priority: explicit DATABASE_URL, or build from POSTGRES/DB vars, fallback to PostgreSQL default
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/latrocore"
    )
    
    # JWT & Signing
    JWT_SECRET: str = os.getenv("JWT_SECRET", "latrocore_super_secure_jwt_signing_key_32bytes_minimum_length_required")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ISSUER: str = os.getenv("JWT_ISSUER", "latrocore-auth")
    JWT_AUDIENCE: str = os.getenv("JWT_AUDIENCE", "latrocore-client")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Cookies
    # Note: Path=/auth works with __Secure- prefix or standard cookie names without Domain attribute.
    # (RFC 6265bis forbids Path != '/' when using the '__Host-' prefix.)
    COOKIE_NAME: str = os.getenv("COOKIE_NAME", "__Secure-refresh")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "true").lower() in ("true", "1", "yes")
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "strict")
    COOKIE_PATH: str = os.getenv("COOKIE_PATH", "/auth")
    
    # CORS & CSRF
    ALLOWED_ORIGINS: List[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
    ] if os.getenv("ALLOWED_ORIGINS") else [
        "https://localhost:5173",
        "https://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:3000",
        "http://localhost:3000",
    ]
    ALLOW_ORIGIN_REGEX: str = os.getenv(
        "ALLOW_ORIGIN_REGEX",
        r"^https:\/\/.*\.vercel\.app$|^https:\/\/.*\.railway\.app$|^https:\/\/.*\.onrender\.com$"
    )
    ALLOW_MISSING_ORIGIN: bool = os.getenv("ALLOW_MISSING_ORIGIN", "true").lower() in ("true", "1", "yes")
    CSRF_HEADER_NAME: str = "x-requested-with"
    CSRF_HEADER_VALUE: str = "xmlhttprequest"
    
    # Rate Limiting
    MAX_LOGIN_ATTEMPTS_PER_ACCOUNT: int = int(os.getenv("MAX_LOGIN_ATTEMPTS_PER_ACCOUNT", "5"))
    MAX_LOGIN_ATTEMPTS_PER_IP: int = int(os.getenv("MAX_LOGIN_ATTEMPTS_PER_IP", "10"))
    RATE_LIMIT_WINDOW_MINUTES: int = int(os.getenv("RATE_LIMIT_WINDOW_MINUTES", "15"))
    RATE_LIMIT_LOCKOUT_MINUTES: int = int(os.getenv("RATE_LIMIT_LOCKOUT_MINUTES", "15"))

    # Gemini AI Integration & Guardrails
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

    # Email Service (Brevo HTTP REST & Resend & SMTP)
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    BREVO_SENDER_EMAIL: str = os.getenv("BREVO_SENDER_EMAIL", "enoenoch945@gmail.com")
    BREVO_SENDER_NAME: str = os.getenv("BREVO_SENDER_NAME", "LATROCORE")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM: str = os.getenv("RESEND_FROM", "LATROCORE <onboarding@resend.dev>")


settings = Settings()


def validate_security_settings():
    """Fail startup if required security secrets are missing or insecure."""
    secret = settings.JWT_SECRET.strip() if settings.JWT_SECRET else ""
    if not secret:
        raise RuntimeError("FATAL SECURITY ERROR: JWT_SECRET environment variable is missing!")
    
    if len(secret) < 32:
        raise RuntimeError(
            f"FATAL SECURITY ERROR: JWT_SECRET is too short ({len(secret)} chars). "
            "It must be at least 32 characters (256 bits) for cryptographic security."
        )
    
    insecure_defaults = [
        "dev-secret-key",
        "secret",
        "secretkey",
        "changeme",
        "password",
        "12345678901234567890123456789012",
        "latrocore_production_secret_key_change_me"
    ]
    if settings.ENVIRONMENT == "production" and secret.lower() in insecure_defaults:
        raise RuntimeError(
            "FATAL SECURITY ERROR: JWT_SECRET is set to an insecure default placeholder in production mode!"
        )
