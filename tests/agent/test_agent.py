"""
Agent unit tests — ClaimExtractor, SourceRanker, ConfidenceScorer, TrustScoreCalculator
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "agent"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))


class TestSourceRanker:
    def setup_method(self):
        from agent.tools.source_ranker import SourceRanker
        self.ranker = SourceRanker()

    def _score(self, url):
        results = [{"url": url, "content": "test", "score": 0.9}]
        ranked = self.ranker.rank(results)
        return ranked[0]["quality_score"]

    def test_government_domain_high_score(self):
        score = self._score("https://www.cdc.gov/health")
        assert score >= 70

    def test_academic_domain_high_score(self):
        score = self._score("https://mit.edu/research")
        assert score >= 70

    def test_unknown_domain_lower_score(self):
        score = self._score("https://randomsite12345.xyz/page")
        assert score < 70

    def test_established_news_medium_high(self):
        score = self._score("https://reuters.com/article")
        assert score >= 50

    def test_social_media_low_score(self):
        score = self._score("https://reddit.com/r/something")
        assert score < 50

    def test_empty_url_very_low(self):
        results = [{"url": "", "content": "test", "score": 0}]
        ranked = self.ranker.rank(results)
        assert ranked[0]["quality_score"] < 30

    def test_ranks_sorted_desc(self):
        results = [
            {"url": "https://randomsite.xyz", "content": "a", "score": 0.1},
            {"url": "https://nih.gov/article", "content": "b", "score": 0.9},
        ]
        ranked = self.ranker.rank(results)
        assert ranked[0]["quality_score"] >= ranked[1]["quality_score"]


class TestConfidenceScorer:
    def setup_method(self):
        from agent.tools.confidence_scorer import ConfidenceScorer
        self.scorer = ConfidenceScorer()

    def _make_sources(self, quality_scores):
        return [{"quality_score": q, "score": 0.8} for q in quality_scores]

    def test_no_sources_returns_zero(self):
        score = self.scorer.score("VERIFIED", {"confidence": 90}, [])
        assert score == 0

    def test_high_quality_sources_boost_confidence(self):
        sources = self._make_sources([90, 85, 80])
        vr = {"confidence": 80, "supporting_sources": ["a", "b"], "contradicting_sources": []}
        score = self.scorer.score("VERIFIED", vr, sources)
        assert score >= 70

    def test_unverifiable_capped_at_40(self):
        sources = self._make_sources([80])
        vr = {"confidence": 80, "supporting_sources": [], "contradicting_sources": []}
        score = self.scorer.score("UNVERIFIABLE", vr, sources)
        assert score <= 40

    def test_conflict_reduces_confidence(self):
        sources = self._make_sources([70, 70])
        vr = {"confidence": 80, "supporting_sources": ["a"], "contradicting_sources": ["b"]}
        s1 = self.scorer.score("VERIFIED", vr, sources)
        vr2 = {"confidence": 80, "supporting_sources": ["a", "b"], "contradicting_sources": []}
        s2 = self.scorer.score("VERIFIED", vr2, sources)
        assert s1 < s2


class TestTrustScoreCalculator:
    def setup_method(self):
        from agent.tools.trust_score_calculator import TrustScoreCalculator
        self.calc = TrustScoreCalculator()

    def test_all_verified_high_score(self):
        claims = [
            {"verdict": "VERIFIED", "confidence": 95, "importance": "high", "severity": None},
            {"verdict": "VERIFIED", "confidence": 90, "importance": "medium", "severity": None},
        ]
        result = self.calc.calculate(claims)
        assert result["trust_score"] >= 75

    def test_all_false_low_score(self):
        claims = [
            {"verdict": "FALSE", "confidence": 5, "importance": "high", "severity": "HIGH"},
            {"verdict": "FALSE", "confidence": 5, "importance": "high", "severity": "CRITICAL"},
        ]
        result = self.calc.calculate(claims)
        assert result["trust_score"] < 30

    def test_empty_claims_returns_100(self):
        result = self.calc.calculate([])
        assert result["trust_score"] == 100

    def test_critical_false_hurts_more_than_low(self):
        claims_low = [
            {"verdict": "VERIFIED", "confidence": 90, "importance": "high", "severity": None},
            {"verdict": "FALSE", "confidence": 5, "importance": "low", "severity": "LOW"},
        ]
        claims_critical = [
            {"verdict": "VERIFIED", "confidence": 90, "importance": "high", "severity": None},
            {"verdict": "FALSE", "confidence": 5, "importance": "high", "severity": "CRITICAL"},
        ]
        result_low = self.calc.calculate(claims_low)
        result_critical = self.calc.calculate(claims_critical)
        assert result_low["trust_score"] > result_critical["trust_score"]

    def test_breakdown_counts(self):
        claims = [
            {"verdict": "VERIFIED", "confidence": 90, "importance": "high", "severity": None},
            {"verdict": "FALSE", "confidence": 10, "importance": "medium", "severity": "HIGH"},
            {"verdict": "UNVERIFIABLE", "confidence": 30, "importance": "low", "severity": "LOW"},
        ]
        result = self.calc.calculate(claims)
        assert result["breakdown"]["VERIFIED"] == 1
        assert result["breakdown"]["FALSE"] == 1
        assert result["breakdown"]["UNVERIFIABLE"] == 1
