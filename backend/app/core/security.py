from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets
from typing import Optional
from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# ── Per-install API keys (Phase 1, Week 2) ─────────────────────
# Keys look like `tl_<43 url-safe chars>`. Only the SHA-256 hash is stored.

API_KEY_PREFIX = "tl_"
API_KEY_HEADER = "X-API-Key"


def generate_api_key() -> str:
    """Generate a new random per-install API key (returned to caller once)."""
    return f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"


def hash_api_key(key: str) -> str:
    """SHA-256 hash of a key for storage/comparison. Never store plaintext."""
    return sha256(key.encode("utf-8")).hexdigest()


def _extract_key(request: Request) -> Optional[str]:
    """Read the key from X-API-Key or `Authorization: Bearer <key>`."""
    key = request.headers.get(API_KEY_HEADER)
    if key:
        return key.strip()
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


async def require_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Enforce the per-install key on API routes.

    Pass-through (returns None) when REQUIRE_API_KEY is off — this keeps
    the mobile guest flow and existing tests working without a key.
    Staging/production set REQUIRE_API_KEY=true.
    """
    from app.models.models import ApiKey

    if not settings.REQUIRE_API_KEY:
        return None

    key = _extract_key(request)
    if not key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Send it as X-API-Key header or Bearer token.",
        )

    result = await db.execute(select(ApiKey).where(ApiKey.key_hash == hash_api_key(key)))
    record = result.scalars().first()
    if record is None:
        raise HTTPException(status_code=401, detail="Invalid API key.")
    if record.revoked:
        raise HTTPException(status_code=403, detail="API key has been revoked.")

    record.last_used_at = datetime.now(timezone.utc)
    return record
