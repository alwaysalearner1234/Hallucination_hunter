# API Contract v2 (draft — for team review)

Base URL (local): `http://localhost:8000`. All verification routes are under `/api/v1`.
Status: **draft** — A1/A2/B/C review at the Oct 9 sync. Breaking changes need all four to agree.

## Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/v1/verify` | `VerifyRequest` | `VerificationResponse` (sync) |
| POST | `/api/v1/verify/stream` | `VerifyRequest` | `text/event-stream` (SSE, see below) |
| POST | `/api/v1/claims/extract` | `ExtractClaimsRequest` | `ExtractClaimsResponse` |
| POST | `/api/v1/agent/verify` | `AgentVerifyRequest` | `AgentVerifyResponse` |
| GET | `/api/v1/history?page=1&page_size=20` | — | `HistoryListResponse` |
| GET | `/api/v1/history/{session_id}` | — | `VerificationResponse` |
| DELETE | `/api/v1/history/{session_id}` | — | `{"deleted": true, "id": ...}` |
| GET | `/api/v1/health` | — | `HealthResponse` |
| POST | `/api/v1/ocr` | image file (multipart) | `{text, ocr_confidence, character_count, ...}` |
| POST | `/api/v1/upload` | pdf/txt/docx (multipart) | `{text, character_count, truncated, file_type}` |

## Core schemas

```ts
type VerificationMode = "quick" | "standard" | "deep" | "strict"; // default "standard"
type Verdict = "VERIFIED" | "FALSE" | "UNVERIFIABLE";
type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type VerificationStatus = "pending" | "processing" | "complete" | "failed";

interface VerifyRequest {
  text: string;            // 10–50000 chars (enforced, 400/422 over limit)
  mode?: VerificationMode;
  source_type?: "paste" | "share" | "screenshot" | "document" | "demo";
  guest_id?: string | null;
}

interface ClaimResponse {
  id: string;
  claim_index: number;
  text: string;
  claim_type?: string | null;
  importance?: "low" | "medium" | "high" | null;
  verdict?: Verdict | null;
  confidence?: number | null;   // 0–100
  severity?: Severity | null;
  reasoning?: string | null;
  correction?: string | null;
  correction_evidence?: string | null;
  evidence: EvidenceResponse[]; // top ≤3 sources
}

interface EvidenceResponse {
  id: string;
  snippet: string;              // ≤500 chars
  relevance_score?: number | null;
  supports_claim?: boolean | null; // true when verdict == VERIFIED
  source: SourceResponse;
}

interface VerificationResponse {
  verification_id: string;
  status: VerificationStatus;
  trust_score?: number | null;  // 0–100
  total_claims: number;
  verified: number;
  false: number;
  unverifiable: number;
  claims: ClaimResponse[];
  verified_answer?: string | null;
  processing_time_ms?: number | null;
  created_at: string;           // ISO datetime
}

interface AgentVerifyResponse { // simplified, for external AI agents
  safe: boolean;                // trust_score >= 70
  trust_score: number;
  total_claims: number; verified: number; false: number; unverifiable: number;
  claims: { id: string; text: string; verdict: Verdict; confidence: number }[];
}
```

`GET /history` returns `{items: VerificationResponse[], total, page, page_size}`.
`total` is a SQL `COUNT(*)` — the list query stays paginated.

## SSE event names (`POST /api/v1/verify/stream`)

Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
`X-Accel-Buffering: no`. Each frame is `data: {json}\n\n`:

| `event` | `data` | Meaning |
|---------|--------|---------|
| `claims_extracted` | `{count}` | claim count known — show progress stages |
| `claim_verified` | `{claim_index, verdict, ...}` | one claim done — append/update card |
| `trust_score_updated` | `{trust_score}` | live gauge update |
| `complete` | full report object | terminal — persist + render |
| `error` | `{message}` | terminal failure — show error UI |

Between events the server sends `: keepalive` comments. Clients must ignore
comment frames and tolerate reconnects (no `Last-Event-ID` resume in v2).

## Errors

All errors are JSON `{detail: string}`:
`400` input too long · `404` unknown session · `413/415` bad upload ·
`422` validation (raised as `ValueError`) · `500` unexpected ·
`504` agent timeout (`AGENT_TIMEOUT_SECONDS`, default 120 s).

## Open questions for review

1. Per-install API keys + per-key history scoping (Week 2–3, B) — auth scheme TBD.
2. `chrome-extension://` CORS origins (Week 2, B) — currently `BACKEND_CORS_ORIGINS` env.
3. Claim schema character offsets / quoted anchors for page highlighting (C + A1/A2).
4. `429` rate-limit shape with `Retry-After` (Week 3, B) — reserve `{detail, retry_after}`.
