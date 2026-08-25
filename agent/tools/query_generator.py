"""
Query Generator — generates optimal search queries per claim.
"""
import json
from typing import List, Dict, Any
import structlog
from agent.tools.llm_client import llm_client
from agent.prompts.prompts import QUERY_GENERATION_SYSTEM, QUERY_GENERATION_USER

logger = structlog.get_logger()


class QueryGenerator:
    """Generates targeted search queries for each factual claim."""

    async def generate(self, claim: Dict[str, Any]) -> List[str]:
        """
        Generate 2-3 search queries for a claim.

        Args:
            claim: Claim dict with text, type, entities

        Returns:
            List of search query strings
        """
        prompt = QUERY_GENERATION_USER.format(
            claim=claim["text"],
            claim_type=claim.get("type", "general"),
        )

        try:
            result = await llm_client.complete_json(
                system_prompt=QUERY_GENERATION_SYSTEM,
                user_prompt=prompt,
                temperature=0.2,
            )

            # result may be a list directly or a dict with queries key
            if isinstance(result, list):
                queries = result
            elif isinstance(result, dict):
                queries = result.get("queries", result.get("search_queries", []))
            else:
                queries = []

            # Fallback: use claim text directly
            if not queries:
                queries = [claim["text"]]

            # Sanitize
            queries = [str(q).strip() for q in queries if str(q).strip()][:3]
            logger.info("queries_generated", claim_id=claim.get("id"), count=len(queries))
            return queries

        except Exception as e:
            logger.error("query_generation_error", error=str(e))
            # Fallback to direct claim text as query
            return [claim["text"]]
