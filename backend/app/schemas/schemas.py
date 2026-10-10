from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ── Enums ────────────────────────────────────────────────────

class VerificationMode(str, Enum):
    QUICK = "quick"
    STANDARD = "standard"
    DEEP = "deep"
    STRICT = "strict"

class VerificationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"

class Verdict(str, Enum):
    VERIFIED = "VERIFIED"
    FALSE = "FALSE"
    UNVERIFIABLE = "UNVERIFIABLE"

class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Importance(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ClaimType(str, Enum):
    HISTORICAL = "historical"
    SCIENTIFIC = "scientific"
    GEOGRAPHICAL = "geographical"
    POLITICAL = "political"
    ECONOMIC = "economic"
    FINANCIAL = "financial"
    MEDICAL = "medical"
    TECHNICAL = "technical"
    STATISTICAL = "statistical"
    BIOGRAPHICAL = "biographical"
    LEGAL = "legal"
    CURRENT_EVENTS = "current_events"
    COMPANY_INFO = "company_info"
    PRODUCT_INFO = "product_info"
    GENERAL = "general"

class SourceType(str, Enum):
    GOVERNMENT = "government"
    ACADEMIC = "academic"
    NEWS = "news"
    ENCYCLOPEDIA = "encyclopedia"
    COMPANY = "company"
    RESEARCH = "research"
    MEDICAL = "medical"
    UNKNOWN = "unknown"

class SourceInputType(str, Enum):
    PASTE = "paste"
    SHARE = "share"
    SCREENSHOT = "screenshot"
    DOCUMENT = "document"
    DEMO = "demo"


# ── Request Schemas ───────────────────────────────────────────

class VerifyRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50000)
    mode: VerificationMode = VerificationMode.STANDARD
    source_type: SourceInputType = SourceInputType.PASTE
    guest_id: Optional[str] = None

class ExtractClaimsRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50000)

class RetrieveEvidenceRequest(BaseModel):
    claim_text: str = Field(..., min_length=5, max_length=2000)
    claim_type: Optional[ClaimType] = None

class VerifyClaimRequest(BaseModel):
    claim_text: str = Field(..., min_length=5, max_length=2000)
    evidence_snippets: List[Dict[str, Any]] = Field(..., max_length=10)

class CorrectClaimRequest(BaseModel):
    claim_text: str
    verdict: Verdict
    evidence_snippets: List[Dict[str, Any]]

class VerifiedAnswerRequest(BaseModel):
    original_text: str
    session_id: str

class AgentVerifyRequest(BaseModel):
    """External agent API — simplified input/output"""
    text: str = Field(..., min_length=10, max_length=50000)
    mode: VerificationMode = VerificationMode.STANDARD

class FeedbackRequest(BaseModel):
    claim_id: str
    feedback_type: str = Field(..., pattern="^(correct|incorrect|unsure)$")
    comment: Optional[str] = None


# ── Response Schemas ──────────────────────────────────────────

class SourceResponse(BaseModel):
    id: str
    url: str
    title: Optional[str] = None
    publisher: Optional[str] = None
    published_at: Optional[datetime] = None
    source_type: Optional[str] = None
    quality_score: Optional[int] = None
    quality_reasons: List[str] = []

    class Config:
        from_attributes = True

class EvidenceResponse(BaseModel):
    id: str
    snippet: str
    relevance_score: Optional[float] = None
    supports_claim: Optional[bool] = None
    source: SourceResponse

    class Config:
        from_attributes = True

class ClaimResponse(BaseModel):
    id: str
    claim_index: int
    text: str
    claim_type: Optional[str] = None
    importance: Optional[str] = None
    verdict: Optional[Verdict] = None
    confidence: Optional[int] = None
    severity: Optional[Severity] = None
    reasoning: Optional[str] = None
    correction: Optional[str] = None
    correction_evidence: Optional[str] = None
    evidence: List[EvidenceResponse] = []

    class Config:
        from_attributes = True

class VerificationResponse(BaseModel):
    verification_id: str
    status: VerificationStatus
    trust_score: Optional[int] = None
    total_claims: int = 0
    verified: int = 0
    false: int = 0
    unverifiable: int = 0
    claims: List[ClaimResponse] = []
    verified_answer: Optional[str] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ExtractedClaim(BaseModel):
    id: str
    text: str
    claim_type: ClaimType
    importance: Importance
    entities: Dict[str, List[str]] = {}

class ExtractClaimsResponse(BaseModel):
    claims: List[ExtractedClaim]
    total: int

class AgentVerifyResponse(BaseModel):
    """Simplified response for external AI agents"""
    safe: bool
    trust_score: int
    total_claims: int
    verified: int
    false: int
    unverifiable: int
    claims: List[Dict[str, Any]]

class HistoryListResponse(BaseModel):
    items: List[VerificationResponse]
    total: int
    page: int
    page_size: int


# ── Per-install API keys (Phase 1, Week 2) ─────────────────────

class ApiKeyIssueRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)


class ApiKeyIssueResponse(BaseModel):
    key: str  # plaintext — returned ONCE at issuance, never again
    key_id: str
    created_at: datetime
    warning: str = "Store this key now — it is shown only once."

class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    redis: str
    llm: str
    search: str

class ProgressEvent(BaseModel):
    event: str
    data: Dict[str, Any]
    session_id: str
