-- ============================================================
-- Migration 003: tie verification history to per-install API keys
-- (Phase 2, Week 7). NULL api_key_id = pre-key / keyless rows, which stay
-- visible only when auth is off (dev / mobile guest flow).
-- Apply: psql $DATABASE_URL -f database/migrations/003_history_api_key.sql
-- ============================================================

ALTER TABLE verification_sessions
    ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_api_key_id
    ON verification_sessions(api_key_id);
CREATE INDEX IF NOT EXISTS idx_sessions_api_key_created
    ON verification_sessions(api_key_id, created_at DESC);
