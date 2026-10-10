# Staging Runbook (Phase 1, Week 5 — B)

Target: one container host (any VM with Docker) running
`docker-compose.staging.yml`: Postgres + Redis + API behind HTTPS.

## 1. Provision

1. VM with Docker Engine + Compose plugin, ports 80/443 open.
2. DNS: point staging hostname (e.g. `staging-truthlayer.example.com`) at the VM.
3. Clone the repo, check out the release commit, stay on `main`.

## 2. Secrets (no keys in git — ever)

```bash
cp .env.staging.example .env.staging
chmod 600 .env.staging
# fill POSTGRES_PASSWORD, REDIS_PASSWORD, GEMINI_API_KEY, TAVILY_API_KEY, JWT_SECRET
```

Rules: secrets live only in `.env.staging` on the host (0600) and in the
process env inside containers. Rotate by editing the file + `up -d`.

## 3. HTTPS

Terminate TLS in front of the API (Caddyasile recommended — automatic certs):

```bash
# Caddyfile
staging-truthlayer.example.com {
    reverse_proxy 127.0.0.1:8000
}
```

The API itself stays HTTP on port 8000; the extension points at the
`https://` origin. CORS for `chrome-extension://` clients is already handled
in code (`allow_origin_regex`).

## 4. Deploy

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
docker compose -f docker-compose.staging.yml ps   # all three "healthy"
```

First boot applies migrations `001` + `002` via initdb. For an existing
volume, apply manually:

```bash
docker compose -f docker-compose.staging.yml exec postgres \
  psql -U hh_user -d hallucination_hunter -f /docker-entrypoint-initdb.d/002_api_keys.sql
```

## 5. Health checks + smoke test

```bash
curl https://<staging-host>/api/v1/health
# {"status":"ok","database":"ok","redis":"ok","llm":"configured","search":"configured"}

# Issue a per-install key (the extension does this once per install):
curl -X POST https://<staging-host>/api/v1/keys -H 'Content-Type: application/json' -d '{"name":"smoke-test"}'
# {"key":"tl_...","key_id":"...","warning":"Store this key now — ..."}

# Verify without key must 401 on staging (REQUIRE_API_KEY=true):
curl -X POST https://<staging-host>/api/v1/verify -H 'Content-Type: application/json' -d '{"text":"The Earth orbits the Sun. Water boils at 100 C."}'
# {"detail":"Missing API key...","code":...}

# Verify with key (sync) + stream smoke:
curl -X POST https://<staging-host>/api/v1/verify -H "X-API-Key: tl_..." -H 'Content-Type: application/json' -d '{"text":"The Earth orbits the Sun. Water boils at 100 C.","mode":"quick"}'
curl -N -X POST https://<staging-host>/api/v1/verify/stream -H "X-API-Key: tl_..." -H 'Content-Type: application/json' -d '{"text":"The Earth orbits the Sun.","mode":"quick"}'
# expect: retry + :connected, claims_extracted/claim_verified/complete frames
```

Then point the extension at staging: set the API base URL to the staging
`https://` host in `lib/api.ts` (Week 5, A1) and run the right-click flow.

## 6. Operate

- Logs: `docker compose -f docker-compose.staging.yml logs -f backend`
- Update: `git pull && docker compose ... up -d --build`
- Backups: Postgres volume snapshot before each deploy (`pg_dump` weekly).
- On-call watch: `/api/v1/health` status, 5xx rate, p95 latency, spend (tokens + Tavily).
