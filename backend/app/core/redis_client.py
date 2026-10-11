"""
Shared Redis client singleton (Phase 2: cache + metrics + cost counters).

One lazy client for the whole backend; `set_redis` overrides it in tests.
Connection errors are handled by callers (fail-open), never here.
"""
from typing import Optional
import structlog
from app.core.config import settings

logger = structlog.get_logger()

_client = None


def get_redis():
    """Lazy Redis client singleton."""
    global _client
    if _client is None:
        import redis.asyncio as aioredis
        _client = aioredis.from_url(
            settings.REDIS_URL,
            socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
            socket_connect_timeout=settings.REDIS_SOCKET_TIMEOUT,
            health_check_interval=30,
            decode_responses=True,
        )
    return _client


def set_redis(client) -> None:
    """Override the client (tests). Pass None to reset to lazy init."""
    global _client
    _client = client


async def incr_counter(name: str, amount: int = 1) -> None:
    """Best-effort counter increment; silent when Redis is down."""
    try:
        await get_redis().incrby(name, amount)
    except Exception as e:
        logger.warning("counter_unavailable", counter=name, error=str(e))


async def incr_float_counter(name: str, amount: float) -> None:
    """Best-effort float counter increment; silent when Redis is down."""
    try:
        await get_redis().incrbyfloat(name, amount)
    except Exception as e:
        logger.warning("counter_unavailable", counter=name, error=str(e))


async def read_counter(name: str) -> int:
    """Read an int counter; 0 when Redis is down or key missing."""
    try:
        value = await get_redis().get(name)
        return int(value) if value is not None else 0
    except Exception:
        return 0


async def read_float_counter(name: str) -> float:
    """Read a float counter; 0.0 when Redis is down or key missing."""
    try:
        value = await get_redis().get(name)
        return float(value) if value is not None else 0.0
    except Exception:
        return 0.0


def counter_names() -> dict:
    """Central counter key registry (prefixes keep Redis tidy)."""
    return {
        "checks": "tl:metrics:checks",
        "cache_hits": "tl:metrics:cache_hits",
        "cache_misses": "tl:metrics:cache_misses",
        "tokens_in": "tl:metrics:tokens_in",
        "tokens_out": "tl:metrics:tokens_out",
        "searches": "tl:metrics:searches",
        "cost_usd": "tl:metrics:cost_usd",
    }
