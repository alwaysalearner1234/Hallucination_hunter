"""
Claim Verifier — verifies claims using ONLY retrieved evidence.
Never uses LLM's internal knowledge as evidence.
"""
import json
from typing import List, Dict, Any
import structlog
from agent.tools.llm_client import llm_client
from agent.prompts.prompts import CLAIM_VERIFICATION_SYSTEM, CLAIM_VERIFICATION_USER

logger = structlog.get_logger()

# Map LLM internal verdict to external verdict
VERDICT_MAP = {
    "SUPPORTED": "VERIFIED",
    "CONTRADICTED": "FALSE",
    "INSUFFICIENT": "UNVERIFIABLE",
    # Handle variations
    "supported": "VERIFIED",
    "contradicted": "FALSE",
    "insufficient": "UNVERIFIABLE",
    "true": "VERIFIED",
    "false": "FALSE",
    "unverifiable": "UNVERIFIABLE",
}


class ClaimVerifier:
    """
    Verifies a claim against retrieved evidence snippets.
    Maps SUPPORTED/CONTRADICTED/INSUFFICIENT → VERIFIED/FALSE/UNVERIFIABLE.
    """

    async def verify(
        self,
        claim: Dict[str, Any],
        evidence_sources: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Verify a claim against evidence.

        Args:
            claim: Claim dict with text, type, etc.
            evidence_sources: Ranked sources from EvidenceRetriever

        Returns:
            Dict with verdict, confidence, reason, sources, contradictions
        """
        if not evidence_sources:
            return self._insufficient_result(claim, "No evidence was retrieved for this claim.")

        # Format evidence for LLM
        evidence_text = self._format_evidence(evidence_sources)

        prompt = CLAIM_VERIFICATION_USER.format(
            claim=claim["text"],
            evidence=evidence_text,
        )

        try:
            result = await llm_client.complete_json(
                system_prompt=CLAIM_VERIFICATION_SYSTEM,
                user_prompt=prompt,
                temperature=0.0,
            )

            raw_verdict = result.get("verdict", "INSUFFICIENT")
            verdict = VERDICT_MAP.get(raw_verdict, "UNVERIFIABLE")
            confidence = min(100, max(0, int(result.get("confidence", 50))))

            return {
                "verdict": verdict,
                "confidence": confidence,
                "reason": result.get("reason", ""),
                "evidence_summary": result.get("evidence_summary", ""),
                "contradictions": result.get("contradictions", []),
                "supporting_sources": result.get("supporting_sources", []),
                "contradicting_sources": result.get("contradicting_sources", []),
                "sources_used": evidence_sources,
            }

        except Exception as e:
            logger.error("claim_verification_error", claim_id=claim.get("id"), error=str(e))
            return self._insufficient_result(claim, f"Verification failed: {str(e)}")

    def _format_evidence(self, sources: List[Dict[str, Any]]) -> str:
        """Format sources into readable evidence text for LLM."""
        lines = []
        for i, s in enumerate(sources[:5], 1):
            lines.append(
                f"SOURCE {i}:\n"
                f"  Title: {s.get('title', 'Unknown')}\n"
                f"  URL: {s.get('url', 'N/A')}\n"
                f"  Quality: {s.get('quality_score', 'N/A')}/100\n"
                f"  Type: {s.get('source_type', 'unknown')}\n"
                f"  Content: {s.get('content', '')[:800]}\n"
            )
        return "\n".join(lines)

    def _insufficient_result(self, claim: Dict[str, Any], reason: str) -> Dict[str, Any]:
        return {
            "verdict": "UNVERIFIABLE",
            "confidence": 0,
            "reason": reason,
            "evidence_summary": "",
            "contradictions": [],
            "supporting_sources": [],
            "contradicting_sources": [],
            "sources_used": [],
        }
