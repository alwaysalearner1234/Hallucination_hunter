"""
Redis per-key rate limiting (Phase 1, Week 3).

Fixed-window counter per identity per minute: `ratelimit:{identity}:{minute}`.
Identity = SHA-256 prefix of the caller's API key, else the client IP.
Fails OPEN when Redis is unreachable (availability over strictness) and logs.
"""
import time
from hashlib import sha256
from typing import Optional
import structlog
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.errors import RateLimitExceeded, error_body
from app.core.security import API_KEY_HEADER

logger = structlog.get_logger()

_redis = None


def get_redis():
    """Lazy Redis client singleton (overridable in tests via set_redis)."""
    global _redis
    if _redis is None:
        import redis.asyncio as aioredis
        _redis = aioredis.from_url(settings.REDIS_URL)
    return _redis


def set_redis(client) -> None:
    """Override the Redis client (tests). Pass None to reset to lazy init."""
    global _redis
    _redis = client


def identity_for(request: Request) -> str:
    """Stable rate-limit identity without storing raw keys in Redis key names."""
    raw = request.headers.get(API_KEY_HEADER)
    if not raw:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            raw = auth[7:].strip()
    if raw:
        return "key:" + sha256(raw.encode()).hexdigest()[:16]
    client = request.client.host if request.client else "unknown"
    return f"ip:{client}"


async def check_rate_limit(identity: str) -> None:
    """Increment the caller's window counter; raise RateLimitExceeded if over."""
    if not settings.RATE_LIMIT_ENABLED:
        return
    limit = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
    window = int(time.time() // 60)
    redis_key = f"ratelimit:{identity}:{window}"
    try:
        client = get_redis()
        count = await client.incr(redis_key)
        if count == 1:
            await client.expire(redis_key, 70)
        if count > limit:
            ttl = await client.ttl(redis_key)
            raise RateLimitExceeded(retry_after=max(int(ttl), 1) if ttl and ttl > 0 else 60)
    except RateLimitExceeded:
        raise
    except Exception as e:
        # Fail open: a Redis outage must not take the API down.
        logger.warning("rate_limit_redis_unavailable", error=str(e))


# Paths subject to rate limiting (health/keys/docs stay unlimited).
LIMITED_PREFIXES = ("/api/v1/verify", "/api/v1/claims", "/api/v1/agent/verify")


async def rate_limit_middleware(request: Request, call_next):
    if not any(request.url.path.startswith(p) for p in LIMITED_PREFIXES):
        return await call_next(request)
    try:
        await check_rate_limit(identity_for(request))
    except RateLimitExceeded as e:
        return JSONResponse(
            status_code=429,
            content=error_body("RATE_LIMITED", "Rate limit exceeded. Slow down and retry."),
            headers={"Retry-After": str(e.retry_after)},
        )
    return await call_next(request)
