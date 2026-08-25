"""
Confidence Scorer — calculates per-claim confidence (0-100).
Uses evidence quality, source agreement, recency, and quantity.
"""
from typing import List, Dict, Any
import structlog

logger = structlog.get_logger()


class ConfidenceScorer:
    """
    Computes a calibrated confidence score for each claim verdict.
    Takes into account: source quality, agreement, count, relevance, recency.
    """

    def score(
        self,
        verdict: str,
        verification_result: Dict[str, Any],
        sources: List[Dict[str, Any]],
    ) -> int:
        """
        Calculate confidence score 0-100.

        Args:
            verdict: VERIFIED | FALSE | UNVERIFIABLE
            verification_result: Output from ClaimVerifier
            sources: Ranked sources from EvidenceRetriever

        Returns:
            Confidence integer 0-100
        """
        if not sources:
            return 0

        # Start with LLM's confidence estimate
        base_confidence = int(verification_result.get("confidence", 50))

        # ── Factor 1: Source quality ────────────────────
        avg_quality = self._avg_quality(sources)
        quality_boost = int((avg_quality - 50) / 5)  # ±10 range

        # ── Factor 2: Source count ──────────────────────
        count = len(sources)
        count_boost = min(10, count * 2)

        # ── Factor 3: Source agreement ──────────────────
        supporting = len(verification_result.get("supporting_sources", []))
        contradicting = len(verification_result.get("contradicting_sources", []))
        if supporting > 0 and contradicting > 0:
            agreement_penalty = -15  # Sources disagree
        elif contradicting > 0 and supporting == 0:
            agreement_penalty = -5
        else:
            agreement_penalty = 5

        # ── Factor 4: Verdict-specific adjustments ──────
        if verdict == "UNVERIFIABLE":
            # Low confidence for unverifiable is honest
            final = min(base_confidence, 40)
        else:
            final = base_confidence + quality_boost + count_boost + agreement_penalty

        return max(0, min(100, final))

    def _avg_quality(self, sources: List[Dict[str, Any]]) -> float:
        scores = [s.get("quality_score", 40) for s in sources if s.get("quality_score") is not None]
        return sum(scores) / len(scores) if scores else 40.0
