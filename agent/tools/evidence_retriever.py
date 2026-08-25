"""
Evidence Retriever — orchestrates search + ranking for each claim.
"""
import asyncio
from typing import List, Dict, Any
import structlog
from agent.tools.query_generator import QueryGenerator
from agent.retrieval.tavily_client import tavily_client
from agent.tools.source_ranker import SourceRanker
from app.core.config import settings

logger = structlog.get_logger()

query_generator = QueryGenerator()
source_ranker = SourceRanker()


class EvidenceRetriever:
    """
    Full evidence retrieval pipeline per claim:
    claim → queries → search → deduplicate → rank → top N sources
    """

    def __init__(self, mode: str = "standard"):
        self.mode = mode
        self.max_sources = settings.MAX_SOURCES_PER_CLAIM
        self.search_depth = self._search_depth_for_mode(mode)

    def _search_depth_for_mode(self, mode: str) -> str:
        return "advanced" if mode in ("deep", "strict") else "basic"

    async def retrieve(
        self, claim: Dict[str, Any], iteration: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Retrieve ranked evidence sources for a claim.

        Args:
            claim: Claim dict
            iteration: Retrieval attempt number (for progressive search)

        Returns:
            List of ranked source+evidence dicts
        """
        logger.info("evidence_retrieval_start", claim_id=claim.get("id"), iteration=iteration)

        # Generate queries
        queries = await query_generator.generate(claim)

        # Adjust search depth for retries
        depth = "advanced" if iteration > 0 else self.search_depth

        # Search all queries concurrently
        all_results = await tavily_client.multi_search(
            queries=queries,
            max_results_per_query=self.max_sources,
        )

        if not all_results:
            logger.warning("no_evidence_found", claim_id=claim.get("id"), queries=queries)
            return []

        # Rank sources
        ranked = source_ranker.rank(all_results)

        # Take top N
        top = ranked[:self.max_sources]

        logger.info(
            "evidence_retrieval_complete",
            claim_id=claim.get("id"),
            raw_count=len(all_results),
            top_count=len(top),
        )
        return top
