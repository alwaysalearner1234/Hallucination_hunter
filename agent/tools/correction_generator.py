"""
Correction Generator — generates evidence-based corrections for false claims.
Never fabricates corrections without evidence.
"""
from typing import List, Dict, Any, Optional
import structlog
from agent.tools.llm_client import llm_client
from agent.prompts.prompts import CORRECTION_GENERATION_SYSTEM, CORRECTION_GENERATION_USER

logger = structlog.get_logger()


class CorrectionGenerator:
    """
    Generates factual corrections for FALSE claims using retrieved evidence.
    Does NOT generate corrections for VERIFIED or UNVERIFIABLE claims.
    """

    async def generate(
        self,
        claim: Dict[str, Any],
        evidence_sources: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a correction for a false claim.

        Args:
            claim: Claim dict (must have verdict=FALSE)
            evidence_sources: Sources containing contradicting evidence

        Returns:
            Dict with correction, explanation, evidence_basis, or None if no correction possible
        """
        if claim.get("verdict") != "FALSE":
            return None

        if not evidence_sources:
            return None

        # Format evidence
        evidence_text = "\n".join([
            f"SOURCE: {s.get('title', 'Unknown')}\n"
            f"URL: {s.get('url', '')}\n"
            f"CONTENT: {s.get('content', '')[:500]}"
            for s in evidence_sources[:3]
        ])

        prompt = CORRECTION_GENERATION_USER.format(
            claim=claim["text"],
            evidence=evidence_text,
        )

        try:
            result = await llm_client.complete_json(
                system_prompt=CORRECTION_GENERATION_SYSTEM,
                user_prompt=prompt,
                temperature=0.1,
            )

            correction = result.get("correction", "").strip()
            if not correction:
                return None

            logger.info("correction_generated", claim_id=claim.get("id"))
            return {
                "correction": correction,
                "explanation": result.get("explanation", ""),
                "evidence_basis": result.get("evidence_basis", ""),
            }

        except Exception as e:
            logger.error("correction_generation_error", claim_id=claim.get("id"), error=str(e))
            return None
