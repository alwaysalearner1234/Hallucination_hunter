# Load Test Plan (Phase 2, Week 9 — B)

## Expected beta traffic
- 10–20 beta users (Phase 3 plan), each verifying a few AI answers per day.
- Realistic peak: **~10 concurrent checks**, each 3–8 claims, `quick` mode.
- Test at **10× headroom**: 100 requests at concurrency 10, then 200 at 20.

## What we assert
- p95 latency within budget (default 60 s for `quick` under load; the
  ~25 s milestone target is single-check `standard` mode, measured separately).
- Error rate < 5%; 429s are expected under burst and must carry `Retry-After`.
- No 500s; every stream ends in `complete` or `error`.

## Run it (against staging only — never prod)
```bash
python tests/load/run_load.py --base-url https://<staging-host> \
  --key tl_<staging-key> --requests 100 --concurrency 10
```

## Past results
- (Fill after first staging run; commit the numbers here.)
- Run 1 (date, commit): requests=…, p50=…, p95=…, errors=…

## Tuning levers (applied)
- `MAX_CLAIM_CONCURRENCY` (parallel claims per check) + `CLAIM_TIMEOUT_SECONDS`.
- DB pool via `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` (see config).
- Redis socket timeouts via `REDIS_SOCKET_TIMEOUT`.
- Verdict cache absorbs repeat claims (see `/api/v1/metrics` hit rate).
- History `page_size` capped at 100; key-scoped indexes in migration 004.
