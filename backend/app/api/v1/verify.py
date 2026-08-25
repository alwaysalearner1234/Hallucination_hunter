"""
Verification API routes — POST /verify, /verify/stream, /claims/extract, etc.
"""
import uuid
import asyncio
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import structlog

from app.core.database import get_db
from app.core.config import settings
from app.models.models import VerificationSession, Claim, Source, Evidence
from app.schemas.schemas import (
    VerifyRequest, VerificationResponse, ExtractClaimsRequest,
    ExtractClaimsResponse, AgentVerifyRequest, AgentVerifyResponse,
    VerificationStatus, ClaimResponse, SourceResponse, EvidenceResponse,
    HistoryListResponse,
)
from app.services.verification_service import verification_service

router = APIRouter()
logger = structlog.get_logger()


# ── POST /verify (sync) ──────────────────────────────────────
@router.post("/verify", response_model=VerificationResponse)
async def verify(
    request: VerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Full synchronous verification pipeline."""
    if len(request.text) > settings.MAX_INPUT_LENGTH:
        raise HTTPException(400, f"Input too long. Max {settings.MAX_INPUT_LENGTH} characters.")

    # Create session
    session = await verification_service.create_session(db, request)
    session_id = str(session.id)

    try:
        result = await verification_service.verify_sync(
            session_id=session_id,
            text=request.text,
            mode=request.mode.value,
            db=db,
        )
    except TimeoutError:
        raise HTTPException(504, "Verification timed out. Try with fewer claims or QUICK mode.")
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        logger.error("verify_error", error=str(e))
        raise HTTPException(500, f"Verification failed: {str(e)}")

    return _build_response(session_id, result)


# ── POST /verify/stream (SSE) ────────────────────────────────
@router.post("/verify/stream")
async def verify_stream(
    request: VerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Streaming verification via Server-Sent Events."""
    if len(request.text) > settings.MAX_INPUT_LENGTH:
        raise HTTPException(400, "Input too long.")

    session = await verification_service.create_session(db, request)
    session_id = str(session.id)

    return StreamingResponse(
        verification_service.verify_with_stream(
            session_id=session_id,
            text=request.text,
            mode=request.mode.value,
            db=db,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ── POST /claims/extract ─────────────────────────────────────
@router.post("/claims/extract", response_model=ExtractClaimsResponse)
async def extract_claims(request: ExtractClaimsRequest):
    """Extract claims without full verification."""
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "agent"))
    from agent.tools.claim_extractor import ClaimExtractor

    extractor = ClaimExtractor()
    try:
        claims = await extractor.extract(request.text)
    except ValueError as e:
        raise HTTPException(422, str(e))

    return ExtractClaimsResponse(
        claims=claims,
        total=len(claims),
    )


# ── POST /agent/verify (external API) ───────────────────────
@router.post("/agent/verify", response_model=AgentVerifyResponse)
async def agent_verify(
    request: AgentVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Simplified verification endpoint for external AI agents."""
    verify_req = VerifyRequest(
        text=request.text,
        mode=request.mode,
    )
    session = await verification_service.create_session(db, verify_req)
    result = await verification_service.verify_sync(
        session_id=str(session.id),
        text=request.text,
        mode=request.mode.value,
        db=db,
    )

    return AgentVerifyResponse(
        safe=(result.get("trust_score", 0) >= 70),
        trust_score=result.get("trust_score", 0),
        total_claims=result.get("total_claims", 0),
        verified=result.get("verified", 0),
        false=result.get("false", 0),
        unverifiable=result.get("unverifiable", 0),
        claims=[
            {
                "id": c["id"],
                "text": c["text"],
                "verdict": c["verdict"],
                "confidence": c["confidence"],
            }
            for c in result.get("claims", [])
        ],
    )


# ── GET /history ─────────────────────────────────────────────
@router.get("/history", response_model=HistoryListResponse)
async def get_history(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Get verification history (paginated)."""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(VerificationSession)
        .where(VerificationSession.status == "complete")
        .order_by(desc(VerificationSession.created_at))
        .offset(offset)
        .limit(page_size)
    )
    sessions = result.scalars().all()

    count_result = await db.execute(
        select(VerificationSession).where(VerificationSession.status == "complete")
    )
    total = len(count_result.scalars().all())

    return HistoryListResponse(
        items=[_session_to_response(s) for s in sessions],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── GET /history/{id} ────────────────────────────────────────
@router.get("/history/{session_id}", response_model=VerificationResponse)
async def get_history_item(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VerificationSession).where(VerificationSession.id == session_id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Verification not found")
    return _session_to_response(session)


# ── DELETE /history/{id} ─────────────────────────────────────
@router.delete("/history/{session_id}")
async def delete_history_item(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VerificationSession).where(VerificationSession.id == session_id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Verification not found")
    await db.delete(session)
    await db.commit()
    return {"deleted": True, "id": session_id}


# ── Helpers ───────────────────────────────────────────────────
def _build_response(session_id: str, result: Dict) -> VerificationResponse:
    from datetime import datetime, timezone
    return VerificationResponse(
        verification_id=session_id,
        status=VerificationStatus.COMPLETE,
        trust_score=result.get("trust_score"),
        total_claims=result.get("total_claims", 0),
        verified=result.get("verified", 0),
        false=result.get("false", 0),
        unverifiable=result.get("unverifiable", 0),
        claims=[_claim_to_response(c) for c in result.get("claims", [])],
        processing_time_ms=result.get("processing_time_ms"),
        created_at=datetime.now(timezone.utc),
    )


def _claim_to_response(c: Dict) -> ClaimResponse:
    return ClaimResponse(
        id=c.get("id", str(uuid.uuid4())),
        claim_index=c.get("claim_index", 0),
        text=c.get("text", ""),
        claim_type=c.get("claim_type"),
        importance=c.get("importance"),
        verdict=c.get("verdict"),
        confidence=c.get("confidence"),
        severity=c.get("severity"),
        reasoning=c.get("reasoning"),
        correction=c.get("correction"),
        correction_evidence=c.get("correction_evidence"),
        evidence=[
            EvidenceResponse(
                id=str(uuid.uuid4()),
                snippet=s.get("content", "")[:500],
                relevance_score=s.get("score"),
                supports_claim=(c.get("verdict") == "VERIFIED"),
                source=SourceResponse(
                    id=str(uuid.uuid4()),
                    url=s.get("url", ""),
                    title=s.get("title"),
                    quality_score=s.get("quality_score"),
                    quality_reasons=s.get("quality_reasons", []),
                    source_type=s.get("source_type"),
                )
            )
            for s in c.get("sources", [])[:3]
        ],
    )


def _session_to_response(s: VerificationSession) -> VerificationResponse:
    return VerificationResponse(
        verification_id=str(s.id),
        status=VerificationStatus(s.status) if s.status in [e.value for e in VerificationStatus] else VerificationStatus.COMPLETE,
        trust_score=s.trust_score,
        total_claims=s.total_claims or 0,
        verified=s.verified_count or 0,
        false=s.false_count or 0,
        unverifiable=s.unverifiable_count or 0,
        claims=[],
        processing_time_ms=s.processing_time_ms,
        created_at=s.created_at,
    )


# Fix missing import
from typing import Dict
