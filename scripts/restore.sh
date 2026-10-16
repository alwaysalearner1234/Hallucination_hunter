#!/usr/bin/env bash
# Restore test (Phase 3, Week 10 — B). Restores a Postgres dump into a THROWAWAY
# database (never overwrites the live DB) and verifies row counts.
# Usage: ./scripts/restore.sh backups/pg_prod_<stamp>.sql [prod|staging]
set -euo pipefail
DUMP="${1:?usage: restore.sh <backups/pg_*.sql> [prod|staging]}"
STACK="${2:-prod}"
COMPOSE_FILE="docker-compose.prod.yml"
if [ "$STACK" = "staging" ]; then COMPOSE_FILE="docker-compose.staging.yml"; fi
ENV_FILE=".env.${STACK}"
if [ "$STACK" = "prod" ]; then ENV_FILE=".env.prod"; fi

RESTORE_DB="restore_test_$(date -u +%Y%m%dT%H%M%SZ | tr -d ':-')"
echo "[restore] dump=$DUMP stack=$STACK tmpdb=$RESTORE_DB"
test -f "$DUMP" || { echo "[restore] dump not found"; exit 1; }

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "${POSTGRES_USER:-hh_user}" -d postgres -c "CREATE DATABASE $RESTORE_DB;"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "${POSTGRES_USER:-hh_user}" -d "$RESTORE_DB" < "$DUMP"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "${POSTGRES_USER:-hh_user}" -d "$RESTORE_DB" -c \
  "SELECT 'verification_sessions', COUNT(*) FROM verification_sessions UNION ALL SELECT 'api_keys', COUNT(*) FROM api_keys;"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U "${POSTGRES_USER:-hh_user}" -d postgres -c "DROP DATABASE $RESTORE_DB;"
echo "[restore] OK — dump restores cleanly and was dropped afterwards."
