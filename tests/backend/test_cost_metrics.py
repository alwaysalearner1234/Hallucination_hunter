"""
Cost + metrics tests (Phase 2, Week 8).

Covers: token estimation fallback, per-check accumulator isolation and math,
cumulative Redis counters, and the GET /metrics response shape. Stub Redis.
"""
import pytest

from app.core import cost
from app.core.cost import (
    estimate_tokens,
    estimated_cost_usd,
    new_check,
    record_check_totals,
    record_llm,
    record_search,
    summary,
)
from app.core.redis_client import counter_names, set_redis


class StubRedis:
    def __init__(self):
        self.counters = {}

    async def get(self, key):
        return self.counters.get(key)

    async def setex(self, key, ttl, value):
        return True

    async def incr(self, key):
        return await self.incrby(key, 1)

    async def incrby(self, key, amount):
        self.counters[key] = self.counters.get(key, 0) + amount
        return self.counters[key]

    async def incrbyfloat(self, key, amount):
        self.counters[key] = self.counters.get(key, 0.0) + amount
        return self.counters[key]

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
def pricing(monkeypatch):
    monkeypatch.setattr(cost.settings, "COST_USD_PER_1K_INPUT_TOKENS", 1.0)
    monkeypatch.setattr(cost.settings, "COST_USD_PER_1K_OUTPUT_TOKENS", 2.0)
    monkeypatch.setattr(cost.settings, "COST_USD_PER_SEARCH", 0.5)


class TestCostAccumulator:
    def test_estimate_tokens_fallback(self):
        assert estimate_tokens("") == 1
        assert estimate_tokens("abcd" * 100) == 100

    def test_no_active_check_is_safe(self):
        record_llm(10, 10)  # must not raise outside a check
        record_search(2)
        assert summary()["searches"] == 0

    def test_accumulates_and_prices(self, pricing):
        new_check()
        record_llm(1000, 500)
        record_llm(1000, 500, model="gemini")
        record_search(3)
        report = summary()
        assert report["llm_input_tokens"] == 2000
        assert report["llm_output_tokens"] == 1000
        assert report["searches"] == 3
        assert report["model"] == "gemini"
        # 2*1.0 + 1*2.0 + 3*0.5 = 5.5
        assert report["estimated_cost_usd"] == 5.5

    def test_new_check_resets(self, pricing):
        new_check()
        record_search(5)
        new_check()
        assert summary()["searches"] == 0

    async def test_record_check_totals_folds_counters(self, stub, pricing):
        new_check()
        record_llm(1000, 0)
        record_search(2)
        await record_check_totals({**summary(), "session_id": "s1"})
        names = counter_names()
        assert stub.counters[names["checks"]] == 1
        assert stub.counters[names["tokens_in"]] == 1000
        assert stub.counters[names["searches"]] == 2


class TestMetricsEndpoint:
    async def test_empty_metrics_are_zero(self, stub):
        from app.api.v1.metrics import get_metrics
        metrics = await get_metrics()
        assert metrics.cache.hits == 0 and metrics.cache.hit_rate == 0.0
        assert metrics.cost.checks == 0 and metrics.cost.estimated_cost_usd == 0.0

    async def test_hit_rate_math(self, stub):
        from app.api.v1.metrics import get_metrics
        names = counter_names()
        stub.counters[names["cache_hits"]] = 3
        stub.counters[names["cache_misses"]] = 1
        stub.counters[names["checks"]] = 2
        stub.counters[names["cost_usd"]] = 0.125
        metrics = await get_metrics()
        assert (metrics.cache.hits, metrics.cache.misses) == (3, 1)
        assert metrics.cache.hit_rate == 0.75
        assert metrics.cost.checks == 2
        assert metrics.cost.estimated_cost_usd == 0.125
