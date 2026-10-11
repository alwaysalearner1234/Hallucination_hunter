"""
Verdict-cache tests (Phase 2, Week 6).

Covers: normalisation (near-duplicates share a hash), miss→store→hit,
corrupt entries, Redis outage fails open, and end-to-end pipeline proof
that the second identical check skips retrieval entirely. Stub Redis only.
"""
import pytest

from app.core import cache
from app.core.cache import (
    cache_key_for,
    claim_hash,
    get_cached_verdict,
    normalize_claim,
    set_cached_verdict,
)
from app.core.redis_client import set_redis


class StubRedis:
    def __init__(self, fail=False):
        self.store = {}
        self.counters = {}
        self.fail = fail

    def _check(self):
        if self.fail:
            raise ConnectionError("redis down")

    async def get(self, key):
        self._check()
        return self.store.get(key)

    async def setex(self, key, ttl, value):
        self._check()
        self.store[key] = value

    async def incr(self, key):
        self._check()
        self.counters[key] = self.counters.get(key, 0) + 1
        return self.counters[key]

    async def incrby(self, key, amount):
        self._check()
        self.counters[key] = self.counters.get(key, 0) + amount
        return self.counters[key]

    async def incrbyfloat(self, key, amount):
        self._check()
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


class TestNormalisation:
    def test_case_punctuation_whitespace_insensitive(self):
        assert normalize_claim("  The Earth ORBITS the Sun! ") == "the earth orbits the sun"
        assert normalize_claim("Water  boils\nat 100 C!!") == "water boils at 100 c"

    def test_hash_stable_and_discriminating(self):
        a = "The Earth orbits the Sun."
        assert claim_hash(a) == claim_hash("the earth orbits the sun")
        assert claim_hash(a) != claim_hash("The Moon orbits the Earth.")
        assert len(claim_hash(a)) == 64

    def test_cache_key_namespaced(self):
        assert cache_key_for("x").startswith("tl:verdict:v1:")


class TestCacheRoundTrip:
    async def test_miss_then_hit(self, stub):
        payload = {"verdict": "VERIFIED", "confidence": 90, "sources": []}
        assert await get_cached_verdict("Some claim.") is None
        await set_cached_verdict("Some claim.", payload)
        assert await get_cached_verdict("Some claim.") == payload
        assert stub.counters.get("tl:metrics:cache_misses") == 1
        assert stub.counters.get("tl:metrics:cache_hits") == 1

    async def test_near_duplicate_hits(self, stub):
        await set_cached_verdict("The Earth orbits the Sun.", {"verdict": "VERIFIED", "confidence": 95})
        hit = await get_cached_verdict("the earth orbits the sun")
        assert hit is not None and hit["verdict"] == "VERIFIED"

    async def test_corrupt_entry_is_a_miss(self, stub):
        stub.store[cache_key_for("Broken.")] = "{not json"
        assert await get_cached_verdict("Broken.") is None

    async def test_redis_outage_fails_open(self, monkeypatch):
        set_redis(StubRedis(fail=True))
        try:
            assert await get_cached_verdict("Anything.") is None
            await set_cached_verdict("Anything.", {"verdict": "VERIFIED"})  # must not raise
        finally:
            set_redis(None)


class TestPipelineUsesCache:
    async def test_second_identical_check_skips_retrieval(self, stub, monkeypatch):
        from agent.agents import hallucination_hunter as hh_module
        from agent.agents.hallucination_hunter import HallucinationHunterAgent
        from agent.tools.confidence_scorer import ConfidenceScorer
        from agent.tools.trust_score_calculator import TrustScoreCalculator
        from agent.tools.correction_generator import CorrectionGenerator

        monkeypatch.setattr(hh_module.settings, "MAX_CLAIM_CONCURRENCY", 4)
        monkeypatch.setattr(hh_module.settings, "CLAIM_TIMEOUT_SECONDS", 30)

        calls = {"retrieve": 0}

        class Extractor:
            async def extract(self, text):
                return [
                    {"id": "c0", "text": "The Earth orbits the Sun.", "type": "general", "importance": "medium"},
                    {"id": "c1", "text": "Water boils at 100 C.", "type": "general", "importance": "medium"},
                ]

        class Retriever:
            async def retrieve(self, claim, iteration=0):
                calls["retrieve"] += 1
                return [{"url": "https://example.com/e", "content": "x", "score": 0.9, "quality_score": 80}]

        class Verifier:
            async def verify(self, claim, sources):
                return {"verdict": "VERIFIED", "confidence": 90, "reason": "",
                        "evidence_summary": "", "supporting_sources": ["a"],
                        "contradicting_sources": []}

        agent = HallucinationHunterAgent.__new__(HallucinationHunterAgent)
        agent.mode = "standard"
        agent.max_iterations = 1
        agent.claim_extractor = Extractor()
        agent.evidence_retriever = Retriever()
        agent.claim_verifier = Verifier()
        agent.confidence_scorer = ConfidenceScorer()
        agent.trust_calculator = TrustScoreCalculator()
        agent.correction_generator = CorrectionGenerator()

        events1, events2 = [], []

        async def cb1(event, data):
            events1.append((event, data))

        async def cb2(event, data):
            events2.append((event, data))

        report1 = await agent.verify("Two claims here.", progress_callback=cb1)
        report2 = await agent.verify("Two claims here.", progress_callback=cb2)

        # Retrieval ran once per claim on the first check, zero times on repeat.
        assert calls["retrieve"] == 2
        assert report2["verified"] == report1["verified"] == 2
        cached_flags = [d.get("cached") for e, d in events2 if e == "claim_verified"]
        assert cached_flags == [True, True]
        assert all(d.get("cached") is not True for e, d in events1 if e == "claim_verified")
