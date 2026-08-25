"""
Trust Score Calculator — computes overall response trust score.
Weighted by claim importance, severity, and confidence.
Does NOT simply average confidence scores.
"""
from typing import List, Dict, Any
import structlog

logger = structlog.get_logger()

# Importance weights
IMPORTANCE_WEIGHT = {"high": 3, "medium": 2, "low": 1}

# Severity penalty multipliers for false/unverifiable claims
SEVERITY_PENALTY = {
    "CRITICAL": 25,
    "HIGH": 15,
    "MEDIUM": 8,
    "LOW": 3,
}

# Verdict base scores
VERDICT_BASE = {
    "VERIFIED": 100,
    "UNVERIFIABLE": 40,
    "FALSE": 0,
}


class TrustScoreCalculator:
    """
    Computes the Overall Trust Score for a full AI response.
    A CRITICAL false claim severely impacts the score.
    """

    def calculate(self, verified_claims: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate overall trust score.

        Args:
            verified_claims: List of claim dicts with verdict, confidence,
                             importance, severity

        Returns:
            Dict with trust_score, breakdown, weights_used
        """
        if not verified_claims:
            return {"trust_score": 100, "breakdown": {}, "weights_used": {}}

        total_weight = 0
        weighted_score = 0
        breakdown = {"VERIFIED": 0, "FALSE": 0, "UNVERIFIABLE": 0}
        penalty = 0

        for claim in verified_claims:
            verdict = claim.get("verdict", "UNVERIFIABLE")
            importance = claim.get("importance", "medium")
            severity = claim.get("severity", "MEDIUM")
            confidence = claim.get("confidence", 50)

            weight = IMPORTANCE_WEIGHT.get(importance, 2)

            # Base score from verdict
            base = VERDICT_BASE.get(verdict, 40)

            # Scale by confidence
            claim_score = (base * confidence) / 100

            weighted_score += claim_score * weight
            total_weight += weight

            breakdown[verdict] = breakdown.get(verdict, 0) + 1

            # Additional penalties for false/unverifiable claims
            if verdict in ("FALSE", "UNVERIFIABLE"):
                sev = severity if isinstance(severity, str) else "MEDIUM"
                penalty += SEVERITY_PENALTY.get(sev.upper(), 8) * weight

        if total_weight == 0:
            return {"trust_score": 100, "breakdown": breakdown, "penalty": 0}

        raw_score = weighted_score / total_weight
        # Apply severity penalty (normalized by total weight)
        normalized_penalty = penalty / total_weight
        final_score = raw_score - normalized_penalty

        trust_score = max(0, min(100, round(final_score)))

        logger.info(
            "trust_score_calculated",
            raw=raw_score,
            penalty=normalized_penalty,
            final=trust_score,
        )

        return {
            "trust_score": trust_score,
            "breakdown": breakdown,
            "penalty_applied": round(normalized_penalty, 1),
        }

    def assess_severity(
        self, verdict: str, claim_type: str, claim_text: str
    ) -> str:
        """
        Heuristic severity assignment.
        For production, this calls the LLM severity assessment.
        """
        if verdict == "VERIFIED":
            return None

        # Medical claims are always at least HIGH
        if claim_type in ("medical",):
            return "CRITICAL" if verdict == "FALSE" else "HIGH"

        # Financial/legal
        if claim_type in ("financial", "legal"):
            return "HIGH" if verdict == "FALSE" else "MEDIUM"

        # Statistical/numerical
        if claim_type in ("statistical", "economic"):
            return "MEDIUM"

        # Historical/geographical
        if claim_type in ("historical", "geographical", "biographical"):
            return "LOW"

        return "MEDIUM"
