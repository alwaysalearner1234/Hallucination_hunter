"""
Rate-limit tests — Redis per-key limiter (Phase 1, Week 3, Tue Oct 20).

Covers: budget enforced with Retry-After, per-identity isolation, unlimited
paths pass through, Redis outage fails open. Uses a stub Redis (no server).
"""
import pytest

from app.core import rate_limit
from app.core.errors import RateLimitExceeded
from app.core.rate_limit import (
    check_rate_limit,
    identity_for,
    rate_limit_middleware,
    set_redis,
)


class StubRedis:
    def __init__(self, fail=False):
        self.counts = {}
        self.fail = fail

    async def incr(self, key):
        if self.fail:
            raise ConnectionError("redis down")
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key, ttl):
        return True

    async def ttl(self, key):
        return 60


@pytest.fixture
def stub():
    redis = StubRedis()
    set_redis(redis)
    yield redis
    set_redis(None)


@pytest.fixture
def small_budget(monkeypatch):
    monkeypatch.setattr(rate_limit.settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(rate_limit.settings, "RATE_LIMIT_REQUESTS_PER_MINUTE", 2)


def _scope(path="/api/v1/verify", headers=None, host="1.2.3.4"):
    return {
        "type": "http",
        "method": "POST",
        "path": path,
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "client": (host, 5000),
        "query_string": b"",
    }


class TestCheckRateLimit:
    async def test_allows_within_budget(self, stub, small_budget):
        await check_rate_limit("ip:a")
        await check_rate_limit("ip:a")

    async def test_blocks_over_budget_with_retry_after(self, stub, small_budget):
        await check_rate_limit("ip:a")
        await check_rate_limit("ip:a")
        with pytest.raises(RateLimitExceeded) as ei:
            await check_rate_limit("ip:a")
        assert ei.value.retry_after >= 1

    async def test_identities_are_independent(self, stub, small_budget):
        await check_rate_limit("ip:a")
        await check_rate_limit("ip:a")
        await check_rate_limit("ip:b")  # must not raise

    async def test_disabled_limiter_passes(self, stub, monkeypatch):
        monkeypatch.setattr(rate_limit.settings, "RATE_LIMIT_ENABLED", False)
        for _ in range(50):
            await check_rate_limit("ip:a")

    async def test_redis_outage_fails_open(self, monkeypatch, small_budget):
        set_redis(StubRedis(fail=True))
        try:
            for _ in range(10):  # would exceed budget of 2 — must still pass
                await check_rate_limit("ip:a")
        finally:
            set_redis(None)


class TestIdentity:
    def test_api_key_identity_hashes_raw_key(self):
        from starlette.requests import Request
        req = Request(_scope(headers={"X-API-Key": "tl_secret"}))
        ident = identity_for(req)
        assert ident.startswith("key:")
        assert "tl_secret" not in ident

    def test_falls_back_to_ip(self):
        from starlette.requests import Request
        assert identity_for(Request(_scope())) == "ip:1.2.3.4"


class TestMiddleware:
    async def test_unlimited_path_skips_redis(self, stub, small_budget):
        from starlette.requests import Request
        called = []

        async def call_next(request):
            called.append(True)
            return "OK"

        resp = await rate_limit_middleware(Request(_scope("/api/v1/health")), call_next)
        assert resp == "OK" and called and stub.counts == {}

    async def test_limited_path_returns_429_with_retry_after(self, stub, small_budget):
        from starlette.requests import Request

        async def call_next(request):
            return "OK"

        req = Request(_scope("/api/v1/verify"))
        assert await rate_limit_middleware(req, call_next) == "OK"
        assert await rate_limit_middleware(req, call_next) == "OK"
        resp = await rate_limit_middleware(req, call_next)
        assert resp.status_code == 429
        assert resp.headers["Retry-After"].isdigit()
        assert resp.body and b"RATE_LIMITED" in resp.body
