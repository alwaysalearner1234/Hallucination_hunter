#!/usr/bin/env bash
# Postgres + Redis backup (Phase 3, Week 10 — B).
# Usage: ./scripts/backup.sh [prod|staging]   (default: prod)
# Writes timestamped dumps to ./backups/. Run weekly (cron) + before deploys.
set -euo pipefail
STACK="${1:-prod}"
COMPOSE_FILE="docker-compose.prod.yml"
if [ "$STACK" = "staging" ]; then COMPOSE_FILE="docker-compose.staging.yml"; fi
ENV_FILE=".env.${STACK}"
if [ "$STACK" = "prod" ]; then ENV_FILE=".env.prod"; fi

mkdir -p backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
echo "[backup] stack=$STACK compose=$COMPOSE_FILE stamp=$STAMP"

# Postgres logical dump (portable across PG minor versions).
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-hh_user}" -d "${POSTGRES_DB:-hallucination_hunter}" \
  > "backups/pg_${STACK}_${STAMP}.sql"
echo "[backup] postgres -> backups/pg_${STACK}_${STAMP}.sql"

# Redis RDB snapshot (appendonly AOF is the durability story; RDB is the
# portable copy for restore tests). Fail-open: cache + counters rebuild.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis \
  redis-cli -a "${REDIS_PASSWORD:?set REDIS_PASSWORD}" --rdb /tmp/dump.rdb > /dev/null
docker cp hh_redis_prod:/tmp/dump.rdb "backups/redis_${STACK}_${STAMP}.rdb" 2>/dev/null \
  || docker cp hh_redis:/tmp/dump.rdb "backups/redis_${STACK}_${STAMP}.rdb"
echo "[backup] redis -> backups/redis_${STACK}_${STAMP}.rdb"
echo "[backup] DONE. Verify with: ls -la backups/ | tail -5"
