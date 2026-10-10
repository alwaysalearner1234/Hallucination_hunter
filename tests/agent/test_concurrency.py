"""
Concurrency tests — parallel claims with semaphore (Phase 1, Week 3).

Covers: claims run concurrently but bounded by MAX_CLAIM_CONCURRENCY, result
order is preserved, and one failed claim becomes UNVERIFIABLE instead of
failing the whole check. Fully stubbed — no network or LLM calls.
"""
import asyncio
import pytest

from agent.agents import hallucination_hunter as hh_module
from agent.agents.hallucination_hunter import HallucinationHunterAgent


class Tracker:
    def __init__(self):
        self.current = 0
        self.max_seen = 0


class StubExtractor:
    def __init__(self, n):
        self.n = n

    async def extract(self, text):
        return [
            {"id": f"c{i}", "text": f"Claim number {i}", "type": "general", "importance": "medium"}
            for i in range(self.n)
        ]


class StubRetriever:
    def __init__(self, tracker, fail_index=None, delay=0.02):
        self.tracker = tracker
        self.fail_index = fail_index
        self.delay = delay

    async def retrieve(self, claim, iteration=0):
        idx = int(claim["id"][1:])
        if idx == self.fail_index:
            raise RuntimeError("search backend exploded")
        self.tracker.current += 1
        self.tracker.max_seen = max(self.tracker.max_seen, self.tracker.current)
        try:
            await asyncio.sleep(self.delay)
        finally:
            self.tracker.current -= 1
        return [
            {
                "url": f"https://example.com/evidence-{idx}",
                "title": f"Evidence {idx}",
                "content": "supporting content",
                "score": 0.9,
                "quality_score": 80,
            }
        ]


class StubVerifier:
    async def verify(self, claim, sources):
        return {
            "verdict": "VERIFIED",
            "confidence": 90,
            "reason": "stubbed",
            "evidence_summary": "",
            "supporting_sources": ["a"],
            "contradicting_sources": [],
        }


def _make_agent(n, tracker, fail_index=None):
    agent = HallucinationHunterAgent.__new__(HallucinationHunterAgent)
    agent.mode = "standard"
    agent.max_iterations = 1
    agent.claim_extractor = StubExtractor(n)
    agent.evidence_retriever = StubRetriever(tracker, fail_index=fail_index)
    agent.claim_verifier = StubVerifier()
    from agent.tools.confidence_scorer import ConfidenceScorer
    from agent.tools.trust_score_calculator import TrustScoreCalculator
    from agent.tools.correction_generator import CorrectionGenerator
    agent.confidence_scorer = ConfidenceScorer()
    agent.trust_calculator = TrustScoreCalculator()
    agent.correction_generator = CorrectionGenerator()
    return agent


class TestParallelClaims:
    async def test_bounded_parallelism_and_order(self, monkeypatch):
        monkeypatch.setattr(hh_module.settings, "MAX_CLAIM_CONCURRENCY", 2)
        monkeypatch.setattr(hh_module.settings, "CLAIM_TIMEOUT_SECONDS", 30)
        tracker = Tracker()
        agent = _make_agent(5, tracker)

        report = await agent.verify("Some text with several claims.")

        assert report["total_claims"] == 5
        assert [c["claim_index"] for c in report["claims"]] == [0, 1, 2, 3, 4]
        assert tracker.max_seen == 2  # parallel, but never over the semaphore
        assert report["verified"] == 5

    async def test_one_failed_claim_does_not_fail_check(self, monkeypatch):
        monkeypatch.setattr(hh_module.settings, "MAX_CLAIM_CONCURRENCY", 4)
        monkeypatch.setattr(hh_module.settings, "CLAIM_TIMEOUT_SECONDS", 30)
        tracker = Tracker()
        agent = _make_agent(3, tracker, fail_index=1)

        report = await agent.verify("Text where the middle claim blows up.")

        assert report["total_claims"] == 3
        by_index = {c["claim_index"]: c for c in report["claims"]}
        assert by_index[0]["verdict"] == "VERIFIED"
        assert by_index[2]["verdict"] == "VERIFIED"
        assert by_index[1]["verdict"] == "UNVERIFIABLE"
        assert by_index[1]["confidence"] == 0
        assert report["verified"] == 2
        assert report["unverifiable"] == 1
