"""
Rate limiting configuration using slowapi (Starlette-compatible wrapper for limits).

The limiter uses the client's real IP address as the rate-limit key.
Limits are defined as constants so routes can reference them by name.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance — must be attached to app.state.limiter in main.py
limiter = Limiter(key_func=get_remote_address)

# Per-route rate limit strings (requests/minute)
CALCULATE_LIMIT = "30/minute"
INSIGHTS_LIMIT = "10/minute"
ENTRIES_LIMIT = "20/minute"
