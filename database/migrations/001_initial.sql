-- ============================================================
-- Hallucination Hunter — Initial Database Migration
-- ============================================================

-- Users (guest-first: guest_id is always populated)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id VARCHAR(64) UNIQUE,
    email VARCHAR(255) UNIQUE,
    hashed_password VARCHAR(255),
    is_guest BOOLEAN NOT NULL DEFAULT TRUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification sessions
CREATE TABLE IF NOT EXISTS verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    input_text TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'paste',  -- paste, share, screenshot, document, demo
    mode VARCHAR(20) NOT NULL DEFAULT 'standard',       -- quick, standard, deep, strict
    trust_score INTEGER,
    total_claims INTEGER DEFAULT 0,
    verified_count INTEGER DEFAULT 0,
    false_count INTEGER DEFAULT 0,
    unverifiable_count INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',      -- pending, processing, complete, failed
    error_message TEXT,
    ocr_confidence FLOAT,
    verified_answer TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual claims extracted from AI text
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
    claim_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    claim_type VARCHAR(50),     -- historical, scientific, geographical, etc.
    importance VARCHAR(20),     -- low, medium, high
    verdict VARCHAR(20),        -- VERIFIED, FALSE, UNVERIFIABLE
    confidence INTEGER,         -- 0–100
    severity VARCHAR(20),       -- LOW, MEDIUM, HIGH, CRITICAL (for false/unverifiable)
    reasoning TEXT,
    correction TEXT,
    correction_evidence TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sources retrieved for claims
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    title TEXT,
    publisher TEXT,
    published_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_type VARCHAR(50),    -- government, academic, news, encyclopedia, company, unknown
    quality_score INTEGER,      -- 0–100
    quality_reasons JSONB DEFAULT '[]',
    UNIQUE(url)
);

-- Evidence snippets linking claims to sources
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    snippet TEXT NOT NULL,
    relevance_score FLOAT,      -- 0.0–1.0
    supports_claim BOOLEAN,     -- TRUE=supports, FALSE=contradicts, NULL=neutral
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent execution trace (for debugging and evaluation)
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
    stage VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,    -- started, complete, failed
    input_summary TEXT,
    output_summary TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User feedback on individual verdicts
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback_type VARCHAR(30) NOT NULL,  -- correct, incorrect, unsure
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON verification_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_trust_score ON verification_sessions(trust_score);
CREATE INDEX IF NOT EXISTS idx_claims_session_id ON claims(session_id);
CREATE INDEX IF NOT EXISTS idx_claims_verdict ON claims(verdict);
CREATE INDEX IF NOT EXISTS idx_evidence_claim_id ON evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_session_id ON agent_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(url);
