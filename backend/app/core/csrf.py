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
    Validate CSRF protection for state-changing and cookie-authenticated endpoints.
    1. Requires custom header (e.g. X-Requested-With: XMLHttpRequest).
    2. Validates Origin or Referer against explicit allowed origins list and regex.
    """
    # 1. Custom request header check
    header_val = request.headers.get(settings.CSRF_HEADER_NAME)
    if not header_val:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF protection: Missing required request header (X-Requested-With)."
        )
    
    # 2. Exact Origin / Referer check
    origin = request.headers.get("origin")
    if origin:
        if not is_origin_allowed(origin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"CSRF protection: Request origin '{origin}' is not allowed."
            )
    else:
        # If Origin is absent, check Referer
        referer = request.headers.get("referer")
        if referer:
            parsed = urlparse(referer)
            referer_origin = f"{parsed.scheme}://{parsed.netloc}"
            if not is_origin_allowed(referer_origin):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"CSRF protection: Referer origin '{referer_origin}' is not allowed."
                )
