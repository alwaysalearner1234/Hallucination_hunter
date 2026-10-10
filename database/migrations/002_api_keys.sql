-- ============================================================
-- Migration 002: per-install API keys (Phase 1, Week 2)
-- Only the SHA-256 hash of a key is stored; the plaintext key is
-- returned once at issuance and never again.
-- Apply: psql $DATABASE_URL -f database/migrations/002_api_keys.sql
-- (Fresh installs get this automatically via docker-entrypoint-initdb.d
-- only for 001; run 002 manually or re-init the volume.)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(100),
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked ON api_keys(revoked);
