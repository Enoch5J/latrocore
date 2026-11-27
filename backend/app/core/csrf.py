import re
from urllib.parse import urlparse
from fastapi import Request, HTTPException, status
from app.core.config import settings


def is_origin_allowed(check_origin: str) -> bool:
    if not check_origin:
        return False
    if check_origin in settings.ALLOWED_ORIGINS:
        return True
    if settings.ALLOW_ORIGIN_REGEX and re.match(settings.ALLOW_ORIGIN_REGEX, check_origin):
        return True
    return False


def verify_csrf(request: Request):
    """
    Validate Origin / Referer and custom CSRF header for auth endpoints
    (/auth/login, /auth/refresh, /auth/logout).
    Policy for missing Origin:
    - If Origin is present: must match ALLOWED_ORIGINS or ALLOW_ORIGIN_REGEX.
    - If Origin is absent and Referer is present: Referer origin must match allowlist.
    - If both Origin and Referer are absent (non-browser clients / same-origin privacy stripping):
      permitted only when settings.ALLOW_MISSING_ORIGIN is True AND the custom
      X-Requested-With header is present.
    """
    # 1. Custom request header check
    header_val = request.headers.get(settings.CSRF_HEADER_NAME)
    if not header_val or header_val.strip().lower() != settings.CSRF_HEADER_VALUE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF protection: Missing or invalid request header (X-Requested-With)."
        )

    # 2. Exact Origin / Referer check
    origin = request.headers.get("origin")
    if origin:
        if not is_origin_allowed(origin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"CSRF protection: Request origin '{origin}' is not allowed."
            )
        return

    referer = request.headers.get("referer")
    if referer:
        parsed = urlparse(referer)
        referer_origin = f"{parsed.scheme}://{parsed.netloc}"
        if not is_origin_allowed(referer_origin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"CSRF protection: Referer origin '{referer_origin}' is not allowed."
            )
        return

    if not settings.ALLOW_MISSING_ORIGIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF protection: Missing Origin header."
        )
