"""
Claim Extractor — splits AI text into discrete, verifiable factual claims.
"""
import json
from typing import List, Dict, Any
import structlog
from agent.tools.llm_client import llm_client
from agent.prompts.prompts import CLAIM_EXTRACTION_SYSTEM, CLAIM_EXTRACTION_USER

logger = structlog.get_logger()


class ClaimExtractor:
    """
    Extracts individual factual claims from AI-generated text using LLM.
    Returns structured claim objects with type, importance, and entities.
    """

    async def extract(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract verifiable factual claims from text.

        Args:
            text: AI-generated response text

        Returns:
            List of claim dicts with id, text, type, importance, entities
        """
        logger.info("claim_extraction_start", text_length=len(text))

        prompt = CLAIM_EXTRACTION_USER.format(text=text)

        try:
            result = await llm_client.complete_json(
                system_prompt=CLAIM_EXTRACTION_SYSTEM,
                user_prompt=prompt,
                temperature=0.0,
            )

            claims = result.get("claims", [])

            # Normalize and validate
            normalized = []
            for i, claim in enumerate(claims):
                if not claim.get("text", "").strip():
                    continue

                normalized.append({
                    "id": claim.get("id", f"claim_{i+1}"),
                    "text": claim["text"].strip(),
                    "type": self._normalize_type(claim.get("type", "general")),
                    "importance": self._normalize_importance(claim.get("importance", "medium")),
                    "entities": claim.get("entities", {
                        "people": [], "organizations": [], "locations": [],
                        "dates": [], "numbers": [], "statistics": []
                    }),
                })

            logger.info("claim_extraction_complete", count=len(normalized))
            return normalized

        except Exception as e:
            logger.error("claim_extraction_error", error=str(e))
            # Fallback: return text as single untyped claim
            return [{
                "id": "claim_1",
                "text": text[:500],
                "type": "general",
                "importance": "medium",
                "entities": {},
            }]

    def _normalize_type(self, claim_type: str) -> str:
        valid_types = {
            "historical", "scientific", "geographical", "political",
            "economic", "financial", "medical", "technical", "statistical",
            "biographical", "legal", "current_events", "company_info",
            "product_info", "general"
        }
        t = claim_type.lower().replace(" ", "_").replace("-", "_")
        return t if t in valid_types else "general"

    def _normalize_importance(self, importance: str) -> str:
        valid = {"low", "medium", "high"}
        i = importance.lower()
        return i if i in valid else "medium"
