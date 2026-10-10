"""
Verification Service — bridges API layer with the agent.
Handles DB persistence, SSE streaming, and error handling.
"""
import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional, Dict, Any
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import (
    VerificationSession, Claim, Source, Evidence, AgentRun
)
from app.schemas.schemas import (
    VerifyRequest, VerificationResponse, VerificationStatus,
    ClaimResponse, EvidenceResponse, SourceResponse
)

logger = structlog.get_logger()


def _get_agent(mode: str):
    """Lazy import to avoid circular imports."""
    from agent.agents.hallucination_hunter import HallucinationHunterAgent
    return HallucinationHunterAgent(mode=mode)


class VerificationService:

    async def create_session(
        self,
        db: AsyncSession,
        request: VerifyRequest,
        user_id: Optional[str] = None,
    ) -> VerificationSession:
        session = VerificationSession(
            id=uuid.uuid4(),
            user_id=user_id,
            input_text=request.text,
            source_type=request.source_type.value,
            mode=request.mode.value,
            status="pending",
        )
        db.add(session)
        await db.flush()
        return session

    async def verify_with_stream(
        self,
        session_id: str,
        text: str,
        mode: str,
        db: AsyncSession,
    ) -> AsyncGenerator[str, None]:
        """
        Run verification and yield SSE events as the agent progresses.

        Extension-friendly framing: an initial `retry` hint plus a connected
        comment (so clients know the stream is live), periodic keepalive
        comments for proxies that buffer idle streams, and a guaranteed
        terminal `complete` or `error` event (the stream never just hangs).
        """
        agent = _get_agent(mode)
        events_queue: asyncio.Queue = asyncio.Queue()

        async def on_progress(event: str, data: Dict):
            await events_queue.put((event, data))

        # Run agent in background task
        agent_task = asyncio.create_task(
            agent.verify(text, progress_callback=on_progress)
        )

        # Tell the client how long to wait before reconnecting, if it drops.
        yield "retry: 10000\n: connected\n\n"

        try:
            while True:
                try:
                    event, data = await asyncio.wait_for(events_queue.get(), timeout=10.0)
                    sse_data = json.dumps({"event": event, "data": data, "session_id": session_id})
                    yield f"data: {sse_data}\n\n"

                    if event == "complete":
                        # Persist to DB
                        await self._persist_results(db, session_id, data)
                        break

                except asyncio.TimeoutError:
                    if agent_task.done():
                        exc = agent_task.exception()
                        if exc is not None:
                            if isinstance(exc, (TimeoutError, asyncio.TimeoutError)):
                                payload = {"message": str(exc), "code": "TIMEOUT"}
                            elif isinstance(exc, ValueError):
                                payload = {"message": str(exc), "code": "INVALID_INPUT"}
                            else:
                                payload = {"message": str(exc), "code": "AGENT_ERROR"}
                            yield f"data: {json.dumps({'event': 'error', 'data': payload})}\n\n"
                        break
                    # Send keepalive (prevents proxy/ext buffering timeouts)
                    yield ": keepalive\n\n"

        except Exception as e:
            logger.error("sse_stream_error", session_id=session_id, error=str(e))
            payload = {"message": str(e), "code": "STREAM_ERROR"}
            yield f"data: {json.dumps({'event': 'error', 'data': payload})}\n\n"
        finally:
            if not agent_task.done():
                agent_task.cancel()

    async def verify_sync(
        self,
        session_id: str,
        text: str,
        mode: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """Run verification synchronously (no streaming)."""
        agent = _get_agent(mode)

        try:
            result = await asyncio.wait_for(
                agent.verify(text),
                timeout=settings.AGENT_TIMEOUT_SECONDS,
            )
            await self._persist_results(db, session_id, result)
            return result
        except asyncio.TimeoutError:
            raise TimeoutError(
                f"Verification timed out after {settings.AGENT_TIMEOUT_SECONDS}s"
            )

    async def _persist_results(
        self,
        db: AsyncSession,
        session_id: str,
        report: Dict[str, Any],
    ):
        """Save verification results to PostgreSQL."""
        try:
            # Update session
            from sqlalchemy import update
            await db.execute(
                update(VerificationSession)
                .where(VerificationSession.id == session_id)
                .values(
                    trust_score=report.get("trust_score"),
                    total_claims=report.get("total_claims", 0),
                    verified_count=report.get("verified", 0),
                    false_count=report.get("false", 0),
                    unverifiable_count=report.get("unverifiable", 0),
                    status="complete",
                    processing_time_ms=report.get("processing_time_ms"),
                )
            )

            # Persist sources (upsert)
            source_id_map = {}
            for src in report.get("all_sources", []):
                url = src.get("url", "")
                if not url:
                    continue
                existing = await db.execute(
                    select(Source).where(Source.url == url)
                )
                source_obj = existing.scalars().first()
                if not source_obj:
                    source_obj = Source(
                        url=url,
                        title=src.get("title"),
                        publisher=src.get("publisher"),
                        source_type=src.get("source_type"),
                        quality_score=src.get("quality_score"),
                        quality_reasons=src.get("quality_reasons", []),
                    )
                    db.add(source_obj)
                    await db.flush()
                source_id_map[url] = source_obj.id

            # Persist claims + evidence
            for claim_data in report.get("claims", []):
                claim_obj = Claim(
                    session_id=session_id,
                    claim_index=claim_data.get("claim_index", 0),
                    text=claim_data["text"],
                    claim_type=claim_data.get("claim_type"),
                    importance=claim_data.get("importance"),
                    verdict=claim_data.get("verdict"),
                    confidence=claim_data.get("confidence"),
                    severity=claim_data.get("severity"),
                    reasoning=claim_data.get("reasoning"),
                    correction=claim_data.get("correction"),
                    correction_evidence=claim_data.get("correction_evidence"),
                )
                db.add(claim_obj)
                await db.flush()

                # Persist evidence
                for src in claim_data.get("sources", []):
                    url = src.get("url", "")
                    source_id = source_id_map.get(url)
                    if source_id:
                        ev = Evidence(
                            claim_id=claim_obj.id,
                            source_id=source_id,
                            snippet=src.get("content", "")[:2000],
                            relevance_score=src.get("score"),
                            supports_claim=(
                                claim_data.get("verdict") == "VERIFIED"
                            ),
                        )
                        db.add(ev)

            await db.commit()
            logger.info("results_persisted", session_id=session_id)

        except Exception as e:
            logger.error("persist_error", session_id=session_id, error=str(e))
            await db.rollback()


verification_service = VerificationService()
