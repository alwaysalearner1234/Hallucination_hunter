"""
Per-install API key issuance — POST /keys.

Flow (Phase 1, Week 2): each extension install calls this once, stores the
returned key locally, and sends it as `X-API-Key` (or Bearer token) on every
verification request. Only the SHA-256 hash is stored server-side.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import structlog
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.core.security import generate_api_key, hash_api_key
from app.models.models import ApiKey
from app.schemas.schemas import ApiKeyIssueRequest, ApiKeyIssueResponse

router = APIRouter()
logger = structlog.get_logger()


@router.post("/keys", response_model=ApiKeyIssueResponse, status_code=201)
async def issue_key(
    body: ApiKeyIssueRequest = ApiKeyIssueRequest(),
    db: AsyncSession = Depends(get_db),
):
    """Issue a new per-install API key. The plaintext key is returned once."""
    key = generate_api_key()
    record = ApiKey(
        id=uuid.uuid4(),
        key_hash=hash_api_key(key),
        name=body.name,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    await db.flush()

    logger.info("api_key_issued", key_id=str(record.id), name=body.name)
    return ApiKeyIssueResponse(
        key=key,
        key_id=str(record.id),
        created_at=record.created_at,
    )
