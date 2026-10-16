# Production Runbook (Phase 3, Weeks 10–12 — B)

Target: one container host running `docker-compose.prod.yml`
(Postgres + Redis + API). Staging stays on `docker-compose.staging.yml`;
prod is a separate host with separate secrets.

## 1. Provision

1. VM with Docker Engine + Compose plugin, ports 80/443 open.
2. DNS: point the prod hostname (e.g. `api.truthlayer.example.com`) at the VM.
3. Clone the repo, check out the tagged release (`git checkout v1.0`), stay on the tag.

## 2. Secrets (no keys in git — ever)

```bash
cp .env.prod.example .env.prod
chmod 600 .env.prod
# fill POSTGRES_PASSWORD, REDIS_PASSWORD, GEMINI_API_KEY, TAVILY_API_KEY,
# JWT_SECRET, SENTRY_DSN (prod SHOULD set Sentry)
```

Rules: secrets live only in `.env.prod` on the host (0600) and in process
env inside containers. Rotate by editing the file + `up -d`. The prod image
is `backend/Dockerfile.prod` (self-contained: backend + agent baked in, runs
as non-root `appuser`) — never bind-mount source into prod.

## 3. HTTPS

Terminate TLS in front of the API (Caddy recommended — automatic certs):

```
api.truthlayer.example.com {
    reverse_proxy 127.0.0.1:8000
}
```

The API itself stays HTTP on port 8000 behind the proxy (`--proxy-headers`
is on in prod). The extension points at the `https://` origin. CORS for
`chrome-extension://` clients is handled in code (`allow_origin_regex`).

## 4. Deploy

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml ps   # all three healthy/running
```

First boot applies migrations `001`–`004` via initdb. For an existing
volume, apply manually in order (same as staging-runbook). Pre-deploy:
`./scripts/backup.sh prod`. Post-deploy: `python scripts/prod_smoke.py
--base-url https://<prod-host> --key tl_<prod-key>`.

## 5. Backups (Week 10) + restore test

- Weekly `pg_dump` + Redis RDB via `./scripts/backup.sh prod` (cron) and
  before EVERY deploy. Dumps land in `./backups/` (timestamped, off-host copy
  required — the directory itself is git-ignored).
- Quarterly (and once before launch): `./scripts/restore.sh
  backups/pg_prod_<stamp>.sql prod` restores into a throwaway database,
  checks `verification_sessions` / `api_keys` counts, then drops it.
- Redis is cache + counters only (verdict cache, cost metrics): safe to
  rebuild from zero; Postgres is the durable store.

## 6. Beta + launch monitoring (Weeks 11–12, on-call)

- Health: `GET /api/v1/health` must be `ok/configured` (smoke gates on it).
- Metrics: `GET /api/v1/metrics` → cache hit rate, cumulative spend.
  `python scripts/cost_report.py --base-url https://<prod-host>
  --checks-per-day 200` prints per-check means + daily projection + alerts.
- Logs: `docker compose -f docker-compose.prod.yml logs -f backend`
  (structured: `request_id`, key hash, method, path, status, duration;
  correlate extension reports via `X-Request-ID`).
- Sentry (when `SENTRY_DSN` set): 5xx spike → investigate; cost spike
  (`ALERT_PROJECTED_DAILY_USD`) → cap modes / raise cache TTL / revisit
  `RATE_LIMIT_REQUESTS_PER_MINUTE`.
- Scale levers (from real traffic, Week 12): uvicorn `--workers`,
  `MAX_CLAIM_CONCURRENCY`, `DB_POOL_SIZE`/`DB_MAX_OVERFLOW`,
  `REDIS_SOCKET_TIMEOUT`. Load-test staging first
  (`tests/load/run_load.py`) — never load-test prod.

## 7. Rollback

```bash
git checkout <previous-tag>
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
python scripts/prod_smoke.py --base-url https://<prod-host> --key tl_<prod-key>
```

Migrations `001`–`004` are additive (new tables/columns/indexes) — rolling
back code never requires rolling back the DB.
