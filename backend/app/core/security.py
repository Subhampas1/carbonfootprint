"""
Security middleware and utilities.

SecurityHeadersMiddleware adds defence-in-depth HTTP security headers to
every response, conforming to OWASP best practices.
"""

from __future__ import annotations

import re

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# Pattern matching the device_id validation in CarbonInput Pydantic model
_DEVICE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{8,64}$")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security-related HTTP response headers to every response.

    Headers applied:
      - Content-Security-Policy   — restrict resource origins
      - X-Content-Type-Options    — prevent MIME sniffing
      - X-Frame-Options           — prevent clickjacking
      - X-XSS-Protection          — legacy XSS filter hint
      - Strict-Transport-Security — enforce HTTPS
      - Referrer-Policy           — limit referrer leakage
      - Permissions-Policy        — disable unused browser features
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response: Response = await call_next(request)

        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data:; "
            "connect-src 'self'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        return response


def validate_device_id(device_id: str) -> bool:
    """
    Validate that a device_id string matches the expected safe format.

    Args:
        device_id: String to validate.

    Returns:
        True if valid (8–64 chars, alphanumeric + hyphens + underscores).
        False otherwise.
    """
    return bool(_DEVICE_ID_RE.match(device_id))
