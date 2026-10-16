# Data-Handling Page (Phase 3, Week 11 — B)

Public companion to the privacy policy, linked from the Web Store listing's
privacy field. Short version for reviewers and users.

## In one paragraph

TruthLayer checks AI answers claim-by-claim against live web sources. Your
text goes to our API over HTTPS, is checked with Gemini + Tavily, and the
report comes back to the side panel. History is scoped to your random
per-install key; only its hash is stored. Delete anything any time.

## Data flow

1. You click **Verify** (button, context menu, or shortcut) on an AI answer.
2. Extension sends `{text, mode}` + your `tl_…` key to
   `POST /api/v1/verify` (sync) or `/verify/stream` (SSE).
3. Backend extracts claims, searches Tavily, verifies with Gemini, streams
   back `claims_extracted → claim_verified* → complete`.
4. Panel renders gauge + claim cards + sources; highlights map back to the page.

## Stored where

| Where | What | Control |
|---|---|---|
| Server (Postgres, per-key) | sessions, claims, evidence, scores | list/get/delete per item; `DELETE /data` wipes all |
| Server (Redis, 7 d TTL) | verdict cache by claim hash, cost counters | expires automatically; no personal data |
| Server (backups, 30 d) | encrypted Postgres dumps | restore-tested; off-host copy |
| Your machine | past reports, settings (mode, auto-verify) | panel history + settings; uninstall clears local |

## Never

No account required. No ad tracking. No sale of data. No fabricated
citations — every verdict links the sources it used.

## Verify it yourself

- `GET /api/v1/health` — dependency status (no key needed).
- `GET /api/v1/metrics` — cache + cumulative cost aggregates.
- Every response carries `X-Request-ID` (send your own to correlate).
- Full API shape: `docs/api-contract.md`.
