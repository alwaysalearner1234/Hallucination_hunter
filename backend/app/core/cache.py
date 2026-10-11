"""
Per-claim verdict cache (Phase 2, Week 6).

Same factual claim checked twice — e.g. the same AI answer verified from two
installs — must not burn LLM + search budget twice. Cache key = SHA-256 of
the normalised claim text (lowercase, punctuation stripped, whitespace
collapsed), so near-duplicates ("The Earth orbits the Sun." vs
"the earth orbits the sun") hit the same entry.

Fail-open: any Redis error is a miss, never a 500.
"""
import json
import re
import string
from hashlib import sha256
from typing import Any, Dict, Optional
import structlog
from app.core.config import settings
from app.core.redis_client import counter_names, get_redis, incr_counter

logger = structlog.get_logger()

KEY_PREFIX = "tl:verdict:v1:"
_PUNCT = str.maketrans("", "", string.punctuation)


def normalize_claim(text: str) -> str:
    """Canonical form for cache identity: lower, no punctuation, one-spaced."""
    lowered = (text or "").lower().translate(_PUNCT)
    return re.sub(r"\s+", " ", lowered).strip()


def claim_hash(text: str) -> str:
    """Stable hash of the normalised claim text."""
    return sha256(normalize_claim(text).encode("utf-8")).hexdigest()


def cache_key_for(text: str) -> str:
    return KEY_PREFIX + claim_hash(text)


async def get_cached_verdict(claim_text: str) -> Optional[Dict[str, Any]]:
    """Return the cached claim payload on hit; None on miss or Redis error."""
    counters = counter_names()
    try:
        raw = await get_redis().get(cache_key_for(claim_text))
    except Exception as e:
        logger.warning("verdict_cache_unavailable", error=str(e))
        return None
    if raw is None:
        await incr_counter(counters["cache_misses"])
        return None
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        await incr_counter(counters["cache_misses"])
        return None
    await incr_counter(counters["cache_hits"])
    return payload


async def set_cached_verdict(claim_text: str, payload: Dict[str, Any]) -> None:
    """Store a claim payload for VERDICT_CACHE_TTL_SECONDS. Silent on error."""
    try:
        await get_redis().setex(
            cache_key_for(claim_text),
            settings.VERDICT_CACHE_TTL_SECONDS,
            json.dumps(payload),
        )
    except Exception as e:
        logger.warning("verdict_cache_store_failed", error=str(e))
