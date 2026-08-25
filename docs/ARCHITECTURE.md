# ARCHITECTURE — Hallucination Hunter

## System Overview

```
┌─────────────────────────────────┐
│     ANDROID MOBILE APP          │
│  (React Native + Expo Router)   │
│                                 │
│  Splash → Onboard → Home        │
│  Verify Text / Share Intent     │
│  Screenshot OCR                 │
│  Analysis (SSE live progress)   │
│  Results + Claim Cards          │
│  Claim Detail + Evidence        │
│  History                        │
└────────────┬────────────────────┘
             │ HTTP / SSE
             ▼
┌─────────────────────────────────┐
│     FASTAPI BACKEND             │
│                                 │
│  POST /api/v1/verify            │
│  POST /api/v1/verify/stream     │
│  POST /api/v1/claims/extract    │
│  POST /api/v1/ocr               │
│  POST /api/v1/upload            │
│  GET  /api/v1/history           │
│  POST /api/v1/agent/verify      │
│  GET  /api/v1/health            │
└────────────┬────────────────────┘
             │ function calls
             ▼
┌─────────────────────────────────────────────────────────┐
│     HALLUCINATION HUNTER AGENT                          │
│                                                         │
│  1. ClaimExtractor        → LLM (Gemini/GPT)           │
│  2. QueryGenerator        → LLM                        │
│  3. EvidenceRetriever     → Tavily Search API          │
│  4. SourceRanker          → domain heuristics          │
│  5. ClaimVerifier         → LLM (evidence-only)        │
│  6. ContradictionDetector → conflict analysis          │
│  7. ConfidenceScorer      → multi-factor scoring       │
│  8. TrustScoreCalculator  → weighted aggregation       │
│  9. CorrectionGenerator   → LLM (evidence-based)      │
│  10. ReportGenerator      → structured output          │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌──────────┐    ┌──────────────┐
│PostgreSQL│    │   Redis      │
│          │    │              │
│users     │    │search cache  │
│sessions  │    │rate limiting │
│claims    │    │session state │
│sources   │    └──────────────┘
│evidence  │
│corrections│
└──────────┘
```

---

## Verification Pipeline Detail

```
User Input (text / share / screenshot / document)
          │
          ▼
    [Input Validation]
    - Length check
    - Character limit
          │
          ▼
    [Claim Extraction]
    LLM prompt → structured JSON
    [{id, text, type, importance, entities}]
          │
          ▼
    [Per-Claim Loop] ──────────────────────┐
    │                                       │
    │  [Query Generation]                   │
    │  LLM generates 2-3 search queries     │
    │          │                            │
    │          ▼                            │
    │  [Evidence Retrieval]                 │
    │  Tavily API (concurrent queries)      │
    │  → Deduplication                      │
    │  → Source Ranking (domain scoring)    │
    │          │                            │
    │          ▼                            │
    │  [Claim Verification]                 │
    │  LLM receives: claim + top evidence   │
    │  Returns: SUPPORTED/CONTRADICTED/     │
    │           INSUFFICIENT                │
    │          │                            │
    │          ▼                            │
    │  [Confidence Scoring]                 │
    │  source quality + count + agreement   │
    │          │                            │
    │          ▼                            │
    │  [Correction Generation] (if FALSE)   │
    │  LLM generates evidence-backed fix    │
    │                                       │
    └───────────────────────────────────────┘
          │
          ▼
    [Trust Score Calculation]
    Weighted by: importance × severity × confidence
    A CRITICAL false claim hurts more than LOW
          │
          ▼
    [Report Generation]
    {trust_score, claims[], sources[], corrections[]}
          │
          ▼
    [Database Persistence]
    PostgreSQL: session, claims, sources, evidence
```

---

## Key Design Decisions

### Evidence-Only Verification
The LLM verifier is explicitly instructed to base verdicts **only** on retrieved evidence snippets. It cannot use its internal training data as evidence. This prevents hallucinated citations.

### Three-State Verdict System
`VERIFIED` / `FALSE` / `UNVERIFIABLE` — preserves uncertainty instead of forcing binary classification. If evidence is insufficient, the claim is `UNVERIFIABLE`, not guessed.

### Weighted Trust Score
The overall Trust Score is not a simple average. Claims are weighted by:
- `importance` (high=3, medium=2, low=1)
- `severity` for false/unverifiable claims (CRITICAL=25pt penalty)
- `confidence` (scales the base score)

### Source Quality Scoring
Every source is scored 0-100 based on domain analysis:
- Government (.gov, .gov.xx): +45
- Academic (.edu, peer-reviewed publishers): +40
- Official organizations (WHO, UN, IMF): +42
- Established news (Reuters, BBC, AP): +22
- User-generated (Reddit, Medium, blogs): −15

### Streaming via SSE
The mobile app receives live progress events via Server-Sent Events:
- `claims_extracted` → show claim count immediately
- `claim_verified` → update progress per claim
- `trust_score_updated` → show live score
- `complete` → navigate to results

### Guest-First Architecture
No account required. A random `guest_id` is stored locally. All history is local-first. Accounts would only add cloud sync.

---

## API Design

The backend is intentionally decoupled from the mobile app. The same API powers:
- Android mobile app
- Future iOS app
- Future Chrome extension
- External AI agents (`POST /api/v1/agent/verify`)
