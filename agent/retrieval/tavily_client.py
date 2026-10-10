"""
Tavily Search Client — real evidence retrieval from the web.
"""
import asyncio
from typing import List, Dict, Any, Optional
import httpx
import structlog
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)
from app.core.config import settings

logger = structlog.get_logger()

TAVILY_API_URL = "https://api.tavily.com/search"


def _is_transient_search_error(exc: BaseException) -> bool:
    """Retry on timeouts and 429/5xx — never on 401 (bad key) or other 4xx."""
    if isinstance(exc, httpx.TimeoutException):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code == 429 or exc.response.status_code >= 500
    return False


class TavilyClient:
    """
    Retrieves web search results using the Tavily API.
    Designed for AI applications — returns clean, structured results.
    """

    def __init__(self):
        self.api_key = settings.TAVILY_API_KEY
        self.timeout = settings.SEARCH_TIMEOUT_SECONDS

    def _check_configured(self):
        if not self.api_key or self.api_key == "your_tavily_api_key_here":
            raise ValueError(
                "TAVILY_API_KEY is not configured. "
                "Get a free key at https://tavily.com and set it in your .env file."
            )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(_is_transient_search_error),
        reraise=True,
    )
    async def search(
        self,
        query: str,
        max_results: int = 5,
        search_depth: str = "advanced",
        include_answer: bool = True,
        include_domains: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Search for evidence using Tavily API.

        Args:
            query: Search query
            max_results: Maximum number of results (1-10)
            search_depth: "basic" or "advanced"
            include_answer: Include AI-generated answer summary
            include_domains: Restrict to specific domains (optional)

        Returns:
            Dict with 'results' list and optional 'answer'
        """
        self._check_configured()

        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": min(max_results, 10),
            "search_depth": search_depth,
            "include_answer": include_answer,
            "include_raw_content": False,
            "include_images": False,
        }
        if include_domains:
            payload["include_domains"] = include_domains

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(TAVILY_API_URL, json=payload)
                response.raise_for_status()
                data = response.json()

                results = []
                for r in data.get("results", []):
                    results.append({
                        "url": r.get("url", ""),
                        "title": r.get("title", ""),
                        "content": r.get("content", ""),
                        "score": r.get("score", 0.0),
                        "published_date": r.get("published_date"),
                    })

                logger.info("tavily_search_complete", query=query, result_count=len(results))
                return {
                    "results": results,
                    "answer": data.get("answer"),
                    "query": query,
                }

            except httpx.HTTPStatusError as e:
                logger.error("tavily_http_error", status=e.response.status_code, query=query)
                if e.response.status_code == 401:
                    raise ValueError("Invalid TAVILY_API_KEY. Check your .env file.")
                raise

            except httpx.TimeoutException:
                logger.error("tavily_timeout", query=query)
                raise TimeoutError(f"Search timed out for query: {query}")

            except Exception as e:
                logger.error("tavily_error", error=str(e), query=query)
                raise

    async def multi_search(
        self,
        queries: List[str],
        max_results_per_query: int = 3,
    ) -> List[Dict[str, Any]]:
        """Run multiple queries concurrently and merge results."""
        tasks = [
            self.search(q, max_results=max_results_per_query)
            for q in queries[:3]  # Limit to 3 queries max
        ]
        results_list = await asyncio.gather(*tasks, return_exceptions=True)

        merged = []
        seen_urls = set()

        for r in results_list:
            if isinstance(r, Exception):
                logger.warning("tavily_multi_search_partial_error", error=str(r))
                continue
            for item in r.get("results", []):
                url = item.get("url")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    merged.append(item)

        return merged


tavily_client = TavilyClient()
