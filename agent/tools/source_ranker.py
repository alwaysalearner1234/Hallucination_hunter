"""
Source Ranker — scores source quality on a 0-100 scale.
"""
import re
from typing import List, Dict, Any, Tuple
from urllib.parse import urlparse
import structlog

logger = structlog.get_logger()


# High-quality domain patterns
GOVERNMENT_DOMAINS = re.compile(
    r"\.(gov|gov\.\w{2}|gc\.ca|europa\.eu|un\.org|who\.int|cdc\.gov|nih\.gov)$"
)
ACADEMIC_DOMAINS = re.compile(
    r"\.(edu|ac\.\w{2,3}|edu\.\w{2,3})$"
)
ACADEMIC_PUBLISHERS = [
    "nature.com", "science.org", "cell.com", "thelancet.com",
    "bmj.com", "jamanetwork.com", "nejm.org", "pubmed.ncbi.nlm.nih.gov",
    "scholar.google.com", "arxiv.org", "ssrn.com", "jstor.org",
    "springer.com", "wiley.com", "elsevier.com", "tandfonline.com",
    "oxfordjournals.org", "cambridge.org",
]
ENCYCLOPEDIA_DOMAINS = [
    "wikipedia.org", "britannica.com", "encyclopaedia.com",
]
ESTABLISHED_NEWS = [
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk",
    "nytimes.com", "theguardian.com", "washingtonpost.com",
    "economist.com", "ft.com", "wsj.com", "bloomberg.com",
    "cnn.com", "nbcnews.com", "cbsnews.com", "abc.net.au",
    "dw.com", "france24.com", "aljazeera.com", "theatlantic.com",
]
OFFICIAL_ORGS = [
    "imf.org", "worldbank.org", "un.org", "who.int", "unicef.org",
    "oecd.org", "wto.org", "iaea.org", "nasa.gov", "esa.int",
    "ieee.org", "acm.org", "iso.org",
]
LOW_QUALITY_SIGNALS = [
    "wordpress.com", "blogspot.com", "tumblr.com", "medium.com",
    "quora.com", "reddit.com", "twitter.com", "facebook.com",
    "instagram.com", "tiktok.com", "youtube.com",
]


class SourceRanker:
    """Scores source quality and classifies source type."""

    def rank(self, raw_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Score and classify each source, sorted by quality.

        Args:
            raw_results: List of search results from Tavily

        Returns:
            Sorted list with quality_score, quality_reasons, source_type added
        """
        ranked = []
        for result in raw_results:
            url = result.get("url", "")
            score, reasons, source_type = self._score_source(url, result)
            ranked.append({
                **result,
                "quality_score": score,
                "quality_reasons": reasons,
                "source_type": source_type,
            })

        # Sort by quality score descending
        ranked.sort(key=lambda x: x["quality_score"], reverse=True)
        return ranked

    def _score_source(
        self, url: str, result: Dict[str, Any]
    ) -> Tuple[int, List[str], str]:
        """Return (score, reasons, source_type)."""
        score = 40  # baseline
        reasons = []
        source_type = "unknown"

        if not url:
            return 10, ["No URL provided"], "unknown"

        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower().replace("www.", "")
        except Exception:
            return 10, ["Invalid URL"], "unknown"

        # ── Government ─────────────────────────────────
        if GOVERNMENT_DOMAINS.search(domain):
            score += 45
            reasons.append("Official government source")
            source_type = "government"

        # ── Academic ────────────────────────────────────
        elif ACADEMIC_DOMAINS.search(domain):
            score += 40
            reasons.append("Academic institution")
            source_type = "academic"
        elif any(pub in domain for pub in ACADEMIC_PUBLISHERS):
            score += 38
            reasons.append("Peer-reviewed academic publisher")
            source_type = "academic"

        # ── Official organizations ───────────────────────
        elif any(org in domain for org in OFFICIAL_ORGS):
            score += 42
            reasons.append("Official international organization")
            source_type = "government"

        # ── Encyclopedic ────────────────────────────────
        elif any(enc in domain for enc in ENCYCLOPEDIA_DOMAINS):
            score += 25
            reasons.append("Encyclopedic source")
            source_type = "encyclopedia"

        # ── Established news ────────────────────────────
        elif any(news in domain for news in ESTABLISHED_NEWS):
            score += 22
            reasons.append("Established news organization")
            source_type = "news"

        # ── Low quality ─────────────────────────────────
        elif any(low in domain for low in LOW_QUALITY_SIGNALS):
            score -= 15
            reasons.append("User-generated content platform")
            source_type = "unknown"

        # ── Tavily relevance score ───────────────────────
        tavily_score = result.get("score", 0.0)
        if tavily_score >= 0.8:
            score += 10
            reasons.append("Highly relevant to query")
        elif tavily_score >= 0.5:
            score += 5
            reasons.append("Relevant to query")

        # ── Publication date recency ─────────────────────
        if result.get("published_date"):
            score += 5
            reasons.append("Has publication date")

        # ── HTTPS ────────────────────────────────────────
        if url.startswith("https://"):
            score += 3

        score = max(0, min(100, score))

        if not reasons:
            reasons.append("Website with unknown credibility")

        return score, reasons, source_type
