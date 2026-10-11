-- ============================================================
-- Migration 004: perf indexes for history + key lookups
-- (Phase 2, Week 9). Covers the key-scoped history list (status filter +
-- recency ordering) and API-key last-use ordering.
-- Apply: psql $DATABASE_URL -f database/migrations/004_perf_indexes.sql
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sessions_status_created
    ON verification_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_api_key_status_created
    ON verification_sessions(api_key_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used
    ON api_keys(last_used_at DESC);
