"""
Verification API routes — POST /verify, /verify/stream, /claims/extract, etc.
"""
import uuid
import asyncio
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, desc
import structlog

from agent.tools.claim_extractor import ClaimExtractor

from app.core.database import get_db
from app.core.config import settings
from app.core.security import require_api_key
from app.models.models import ApiKey, VerificationSession, Claim, Source, Evidence
from app.schemas.schemas import (
    VerifyRequest, VerificationResponse, ExtractClaimsRequest,
    ExtractClaimsResponse, AgentVerifyRequest, AgentVerifyResponse,
    VerificationStatus, ClaimResponse, SourceResponse, EvidenceResponse,
    HistoryListResponse, VerifiedAnswerResponse,
)
from app.services.verification_service import verification_service

router = APIRouter()
logger = structlog.get_logger()


# ── POST /verify (sync) ──────────────────────────────────────
@router.post("/verify", response_model=VerificationResponse)
async def verify(
    request: VerifyRequest,
    db: AsyncSession = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    """Full synchronous verification pipeline."""
    if len(request.text) > settings.MAX_INPUT_LENGTH:
        raise HTTPException(400, f"Input too long. Max {settings.MAX_INPUT_LENGTH} characters.")

    # Create session
    session = await verification_service.create_session(
        db, request, api_key_id=_key_id(api_key)
    )
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


# ── POST /verified-answer ──────────────────────────────────────
@router.post("/verified-answer", response_model=VerifiedAnswerResponse)
async def verified_answer(
    request: VerifiedAnswerRequest,
    db: AsyncSession = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    """Rewrite AI response using verified claim analysis.
    
    Takes an AI-generated text and returns a rewritten version where:
    - Verified-false claims are replaced with their corrections
    - Unverifiable claims are marked with [UNVERIFIED] prefix
    - Verified-true content is preserved
    - [Source: url] is added after corrected claims
    """
    session = await verification_service.verified_answer(
        db, request.text, session_id=request.session_id, mode=request.mode.value
    )
    return session
@router.post("/verify/stream")
async def verify_stream(
    request: VerifyRequest,
    db: AsyncSession = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    """Streaming verification via Server-Sent Events."""
    if len(request.text) > settings.MAX_INPUT_LENGTH:
        raise HTTPException(400, "Input too long.")

    session = await verification_service.create_session(
        db, request, api_key_id=_key_id(api_key)
    )
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
            # no-transform stops intermediaries buffering the stream;
            # keep-alive + periodic :keepalive comments keep extension
            # service-worker fetches alive through proxies.
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ── POST /claims/extract ─────────────────────────────────────
@router.post("/claims/extract", response_model=ExtractClaimsResponse)
async def extract_claims(
    request: ExtractClaimsRequest,
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    """Extract claims without full verification."""
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
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    """Simplified verification endpoint for external AI agents."""
    verify_req = VerifyRequest(
        text=request.text,
        mode=request.mode,
    )
    session = await verification_service.create_session(
        db, verify_req, api_key_id=_key_id(api_key)
    )
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
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    """Get verification history (paginated). Scoped to the calling key."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)  # cap: full-table scans are abuse
    offset = (page - 1) * page_size
    base = _history_base(api_key)
    result = await db.execute(
        select(VerificationSession)
        .where(*base)
        .order_by(desc(VerificationSession.created_at))
        .offset(offset)
        .limit(page_size)
    )
    sessions = result.scalars().all()

    count_result = await db.execute(
        select(func.count()).select_from(VerificationSession).where(*base)
    )
    total = count_result.scalar_one()

    return HistoryListResponse(
        items=[_session_to_response(s) for s in sessions],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── GET /history/{id} ────────────────────────────────────────
@router.get("/history/{session_id}", response_model=VerificationResponse)
async def get_history_item(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    result = await db.execute(
        _scoped_session_query(api_key).where(VerificationSession.id == session_id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Verification not found")
    return _session_to_response(session)


# ── DELETE /history/{id} ─────────────────────────────────────
@router.delete("/history/{session_id}")
async def delete_history_item(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    result = await db.execute(
        _scoped_session_query(api_key).where(VerificationSession.id == session_id)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(404, "Verification not found")
    await db.delete(session)
    await db.commit()
    return {"deleted": True, "id": session_id}


# ── DELETE /data (delete-my-data) ─────────────────────────────
@router.delete("/data")
async def delete_my_data(
    db: AsyncSession = Depends(get_db),
    api_key: Optional[ApiKey] = Depends(require_api_key),
):
    """Delete ALL verification history for the calling API key.

    Always requires an authenticated key — even with REQUIRE_API_KEY off —
    so keyless callers can never wipe shared/dev data.
    """
    if api_key is None:
        raise HTTPException(401, "An API key is required to delete personal data.")
    result = await db.execute(
        select(VerificationSession).where(VerificationSession.api_key_id == api_key.id)
    )
    sessions = result.scalars().all()
    for session in sessions:
        await db.delete(session)
    await db.commit()
    return {"deleted": len(sessions)}


# ── Helpers ───────────────────────────────────────────────────
def _key_id(api_key: Optional[ApiKey]):
    """UUID of the calling key, or None for keyless (auth-off) callers."""
    return api_key.id if api_key is not None else None


def _history_base(api_key: Optional[ApiKey]):
    """Shared WHERE conditions for history list + count (key-scoped)."""
    conditions = [VerificationSession.status == "complete"]
    if api_key is not None:
        conditions.append(VerificationSession.api_key_id == api_key.id)
    return conditions


def _scoped_session_query(api_key: Optional[ApiKey]):
    """Base session query: callers only ever see their own key's rows."""
    stmt = select(VerificationSession)
    if api_key is not None:
        stmt = stmt.where(VerificationSession.api_key_id == api_key.id)
    return stmt


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
