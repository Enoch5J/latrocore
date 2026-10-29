import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


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
    COOKIE_NAME: str = os.getenv("COOKIE_NAME", "__Host-refresh")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "true").lower() in ("true", "1", "yes")
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "none" if os.getenv("ENVIRONMENT") == "production" else "strict")
    COOKIE_PATH: str = "/"
    
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
    CSRF_HEADER_NAME: str = "x-requested-with"
    CSRF_HEADER_VALUE: str = "xmlhttprequest"
    
    # Rate Limiting
    MAX_LOGIN_ATTEMPTS_PER_ACCOUNT: int = int(os.getenv("MAX_LOGIN_ATTEMPTS_PER_ACCOUNT", "5"))
    MAX_LOGIN_ATTEMPTS_PER_IP: int = int(os.getenv("MAX_LOGIN_ATTEMPTS_PER_IP", "10"))
    RATE_LIMIT_WINDOW_MINUTES: int = int(os.getenv("RATE_LIMIT_WINDOW_MINUTES", "15"))
    RATE_LIMIT_LOCKOUT_MINUTES: int = int(os.getenv("RATE_LIMIT_LOCKOUT_MINUTES", "15"))

    # Gemini AI Integration & Guardrails
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")


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
