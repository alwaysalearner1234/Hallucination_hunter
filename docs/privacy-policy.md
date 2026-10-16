# TruthLayer Privacy Policy (Phase 3, Weeks 10–11 — B, draft for review)

Status: **draft** — publish at the public URL linked from the Chrome Web
Store listing before submission (Fri Dec 18). B owns the backend claims
below; A1/A2 confirm the extension behaviour matches.

## What we collect

- **Text you verify.** The AI answer you submit is sent to our API to run the
  check. It travels over HTTPS and is processed in memory.
- **Verification artefacts.** Per-claim verdicts, evidence snippets with
  source URLs, trust score, timings, and token/search cost counters.
- **Per-install API key.** One random `tl_…` key per install. We store only
  its SHA-256 hash (never plaintext) plus creation/last-use timestamps.
- **Diagnostics.** Request ID, key identity hash, method/path/status/duration,
  and (when enabled) Sentry error reports. No browsing history.

## What we share with third parties

- **LLM provider (Google Gemini):** claims + evidence to produce verdicts.
- **Search provider (Tavily):** generated search queries to retrieve sources.
- Nothing is shared for advertising. No data brokers, no sale of data.

## What we store, and for how long

- **Server:** verification sessions scoped to your API key
  (`verification_sessions.api_key_id`), retained until you delete them.
  Verdict cache entries (normalised claim hashes, 7-day TTL) and aggregate
  cost counters contain no personal data.
- **Extension:** past reports for the history view, stored locally.
- **Backups:** encrypted Postgres dumps (weekly + pre-deploy), retained 30
  days, off-host copy. Restore tests use throwaway databases.

## Your controls

- History list / open / delete-one in the side panel.
- **Delete-my-data:** `DELETE /api/v1/data` (or the panel button) wipes ALL
  of your key's server history. Always requires your key; keyless callers
  can never wipe shared data.
- Uninstalling the extension stops all future collection; use delete-my-data
  first if you want the server copy gone too.

## Security

HTTPS everywhere (prod terminates TLS at the proxy); secrets in host-only
`.env.prod` (0600), never in git; per-key auth enforced when
`REQUIRE_API_KEY=true` (staging/prod); rate-limited + key-scoped history
(cannot list/delete another key's rows); minimum-permission extension
manifest (see `docs/extension-permissions-review.md`).

## Contact / changes

Policy changes ship with a version date below; material changes are noted in
release notes. Contact: (add support email before publish).

*Version: 2026-12-01 (draft). Effective on publish.*
