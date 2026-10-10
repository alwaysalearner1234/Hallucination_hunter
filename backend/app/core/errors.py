"""
Consistent error responses (Phase 1, Week 4).

Every error the UI can show has the shape:
    {"detail": "<human-readable message>", "code": "<MACHINE_CODE>"}
`detail` stays first for backward compatibility with existing clients.
"""
from typing import Any, Dict


def error_body(code: str, message: str) -> Dict[str, Any]:
    return {"detail": message, "code": code}


class RateLimitExceeded(Exception):
    """Raised when a client exceeds its per-minute request budget."""

    def __init__(self, retry_after: int):
        super().__init__("Rate limit exceeded.")
        self.retry_after = retry_after
