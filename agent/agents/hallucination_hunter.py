"""
Hallucination Hunter Agent — Main Orchestrator
Coordinates all 11 modules to produce a complete verification report.
"""
import asyncio
import time
from typing import List, Dict, Any, AsyncGenerator, Optional, Callable
import structlog

from agent.tools.claim_extractor import ClaimExtractor
from agent.tools.evidence_retriever import EvidenceRetriever
from agent.tools.claim_verifier import ClaimVerifier
from agent.tools.confidence_scorer import ConfidenceScorer
from agent.tools.trust_score_calculator import TrustScoreCalculator
from agent.tools.correction_generator import CorrectionGenerator
from agent.tools.source_ranker import SourceRanker
from app.core.config import settings

logger = structlog.get_logger()


class HallucinationHunterAgent:
    """
    Main agent orchestrating the full verification pipeline.

    Pipeline:
      text → ClaimExtractor → [per-claim: EvidenceRetriever → ClaimVerifier
      → ConfidenceScorer → CorrectionGenerator] → TrustScoreCalculator
      → VerificationReport
    """

    def __init__(self, mode: str = "standard"):
        self.mode = mode
        self.max_iterations = settings.MAX_RETRIEVAL_ITERATIONS

        self.claim_extractor = ClaimExtractor()
        self.evidence_retriever = EvidenceRetriever(mode=mode)
        self.claim_verifier = ClaimVerifier()
        self.confidence_scorer = ConfidenceScorer()
        self.trust_calculator = TrustScoreCalculator()
        self.correction_generator = CorrectionGenerator()

    async def verify(
        self,
        text: str,
        progress_callback: Optional[Callable[[str, Dict], None]] = None,
    ) -> Dict[str, Any]:
        """
        Run the full verification pipeline.

        Args:
            text: AI-generated text to verify
            progress_callback: Optional async callback for progress events

        Returns:
            Complete verification report
        """
        start_time = time.time()

        async def emit(event: str, data: Dict):
            if progress_callback:
                try:
                    await progress_callback(event, data)
                except Exception:
                    pass

        # ── Stage 1: Claim Extraction ─────────────────────────────
        await emit("stage_update", {"stage": "extracting_claims", "label": "Extracting claims..."})
        logger.info("agent_stage", stage="claim_extraction")

        claims = await self.claim_extractor.extract(text)

        await emit("claims_extracted", {
            "count": len(claims),
            "claims": [{"id": c["id"], "text": c["text"]} for c in claims]
        })

        if not claims:
            return self._empty_report(text, "No verifiable claims found in the text.")

        # ── Stage 2–6: Per-claim pipeline (parallel, bounded) ────
        # Claims run concurrently under a semaphore so one slow claim can't
        # serialize the whole check; a single failed claim is isolated and
        # reported UNVERIFIABLE instead of failing the batch.
        semaphore = asyncio.Semaphore(max(1, settings.MAX_CLAIM_CONCURRENCY))

        async def run_one(index: int, single_claim: Dict[str, Any]) -> Dict[str, Any]:
            async with semaphore:
                try:
                    return await asyncio.wait_for(
                        self._verify_claim(single_claim, index, len(claims), emit),
                        timeout=settings.CLAIM_TIMEOUT_SECONDS,
                    )
                except asyncio.TimeoutError:
                    logger.warning("claim_timeout", claim_id=single_claim.get("id"))
                    return await self._failed_claim(
                        single_claim, index, "Claim verification timed out.", emit
                    )
                except Exception as e:
                    logger.error(
                        "claim_failed", claim_id=single_claim.get("id"), error=str(e)
                    )
                    return await self._failed_claim(single_claim, index, str(e), emit)

        verified_claims = list(
            await asyncio.gather(*[run_one(i, c) for i, c in enumerate(claims)])
        )
        all_sources: Dict[str, Dict[str, Any]] = {}
        for claim_result in verified_claims:
            all_sources.update(
                {s["url"]: s for s in claim_result.get("sources", []) if s.get("url")}
            )

        # ── Stage 7: Trust Score ──────────────────────────────────
        await emit("stage_update", {"stage": "calculating_trust", "label": "Calculating Trust Score..."})

        trust_result = self.trust_calculator.calculate(verified_claims)
        trust_score = trust_result["trust_score"]

        await emit("trust_score_updated", {"trust_score": trust_score})

        # ── Final Report ──────────────────────────────────────────
        processing_time_ms = int((time.time() - start_time) * 1000)

        report = {
            "trust_score": trust_score,
            "total_claims": len(verified_claims),
            "verified": sum(1 for c in verified_claims if c["verdict"] == "VERIFIED"),
            "false": sum(1 for c in verified_claims if c["verdict"] == "FALSE"),
            "unverifiable": sum(1 for c in verified_claims if c["verdict"] == "UNVERIFIABLE"),
            "claims": verified_claims,
            "all_sources": list(all_sources.values()),
            "processing_time_ms": processing_time_ms,
            "mode": self.mode,
        }

        await emit("complete", report)
        logger.info("agent_complete", trust_score=trust_score, processing_time_ms=processing_time_ms)
        return report

    async def _verify_claim(
        self,
        claim: Dict[str, Any],
        index: int,
        total: int,
        emit,
    ) -> Dict[str, Any]:
        """Run the full per-claim pipeline: retrieve → verify → score → fix."""
        claim_id = claim["id"]

        await emit("stage_update", {
            "stage": "searching_evidence",
            "label": f"Searching evidence for claim {index+1}/{total}...",
            "claim_id": claim_id,
            "claim_text": claim["text"][:100],
        })

        # ── Evidence Retrieval (with iteration) ─────────────
        sources = []
        for iteration in range(self.max_iterations):
            sources = await self.evidence_retriever.retrieve(claim, iteration=iteration)

            await emit("sources_found", {
                "claim_id": claim_id,
                "count": len(sources),
                "iteration": iteration,
            })

            # If we found sufficient evidence, stop iterating
            if self._sufficient_evidence(sources):
                break

            # For strict mode, require more sources
            if self.mode == "quick":
                break

        # ── Claim Verification ──────────────────────────────
        await emit("stage_update", {
            "stage": "verifying_claim",
            "label": f"Verifying claim {index+1}/{total}...",
            "claim_id": claim_id,
        })

        verification = await self.claim_verifier.verify(claim, sources)

        # ── Confidence Scoring ──────────────────────────────
        confidence = self.confidence_scorer.score(
            verdict=verification["verdict"],
            verification_result=verification,
            sources=sources,
        )

        # ── Severity Assessment ─────────────────────────────
        severity = None
        if verification["verdict"] != "VERIFIED":
            severity = self.trust_calculator.assess_severity(
                verdict=verification["verdict"],
                claim_type=claim.get("type", "general"),
                claim_text=claim["text"],
            )

        # ── Correction Generation ───────────────────────────
        correction = None
        if verification["verdict"] == "FALSE" and sources:
            correction = await self.correction_generator.generate(claim, sources)

        # ── Assemble claim result ───────────────────────────
        claim_result = {
            "id": claim_id,
            "claim_index": index,
            "text": claim["text"],
            "claim_type": claim.get("type", "general"),
            "importance": claim.get("importance", "medium"),
            "verdict": verification["verdict"],
            "confidence": confidence,
            "severity": severity,
            "reasoning": verification.get("reason", ""),
            "evidence_summary": verification.get("evidence_summary", ""),
            "contradictions": verification.get("contradictions", []),
            "correction": correction.get("correction") if correction else None,
            "correction_evidence": correction.get("evidence_basis") if correction else None,
            "sources": sources,
        }

        await emit("claim_verified", {
            "claim_id": claim_id,
            "verdict": verification["verdict"],
            "confidence": confidence,
            "claim_index": index,
            "total": total,
        })
        return claim_result

    async def _failed_claim(
        self,
        claim: Dict[str, Any],
        index: int,
        reason: str,
        emit,
    ) -> Dict[str, Any]:
        """Isolated failure for one claim: UNVERIFIABLE, keeps batch alive."""
        try:
            severity = self.trust_calculator.assess_severity(
                verdict="UNVERIFIABLE",
                claim_type=claim.get("type", "general"),
                claim_text=claim.get("text", ""),
            )
        except Exception:
            severity = "LOW"
        await emit("claim_verified", {
            "claim_id": claim.get("id"),
            "verdict": "UNVERIFIABLE",
            "confidence": 0,
            "claim_index": index,
            "error": reason,
        })
        return {
            "id": claim.get("id"),
            "claim_index": index,
            "text": claim.get("text", ""),
            "claim_type": claim.get("type", "general"),
            "importance": claim.get("importance", "medium"),
            "verdict": "UNVERIFIABLE",
            "confidence": 0,
            "severity": severity,
            "reasoning": f"Verification failed for this claim: {reason}",
            "evidence_summary": "",
            "contradictions": [],
            "correction": None,
            "correction_evidence": None,
            "sources": [],
        }

    def _sufficient_evidence(self, sources: List[Dict]) -> bool:
        """Check if we have enough quality evidence."""
        if not sources:
            return False
        if len(sources) >= 2:
            avg_quality = sum(s.get("quality_score", 0) for s in sources) / len(sources)
            return avg_quality >= 40
        return False

    def _empty_report(self, text: str, reason: str) -> Dict[str, Any]:
        return {
            "trust_score": None,
            "total_claims": 0,
            "verified": 0,
            "false": 0,
            "unverifiable": 0,
            "claims": [],
            "all_sources": [],
            "processing_time_ms": 0,
            "mode": self.mode,
            "error": reason,
        }
