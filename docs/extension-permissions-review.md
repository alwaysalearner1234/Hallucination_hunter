# Extension Permissions Review (Phase 3, Week 10 — B + A1 + A2)

Goal: the manifest requests the MINIMUM Chrome affordances the backend
actually needs. B's backend constraints are fixed below; A1/A2 confirm the
final `manifest.json` matches before the Dec 18 submission.

## Backend constraints (B — fixed)

- API is a single HTTPS origin (`https://<prod-host>`); no other
  `host_permissions` are ever required by the backend.
- Auth is one header (`X-API-Key: tl_…` or `Authorization: Bearer`);
  no cookies, no `webRequest` inspection, no credentials mode beyond the
  default CORS allowlist.
- Extension origins are matched server-side by
  `allow_origin_regex = (chrome-extension|moz-extension|safari-web-extension)://.*`
  — the backend never needs the extension's ID allowlisted.
- SSE needs `Cache-Control: no-cache, no-transform` + keepalive comments;
  the client must ignore comment frames and tolerate reconnects (no
  `Last-Event-ID` resume in v2). No extra permissions implied.

## Recommended manifest shape (A1/A2 to confirm)

- `permissions`: `contextMenus` (right-click "Verify selection"), `storage`
  (per-install key + settings), `sidePanel` (report UI). Nothing else.
- `host_permissions`: ONLY the prod API origin. No `<all_urls>`, no
  search-provider or LLM origins (those calls happen server-side).
- Content scripts / adapters (ChatGPT, Claude, Gemini, Perplexity) run under
  `content_scripts.matches` for those four origins only, each isolated with
  an error boundary so a broken selector fails quietly.
- No `webRequest`/`webRequestBlocking`, no `tabs` (use active-tab messaging),
  no clipboard-read (use selection/context), no background page (service
  worker only, MV3).

## Sign-off

- [ ] A1: side panel + service worker use only the permissions above
- [ ] A2: each adapter declares only its own match pattern; health check fails quiet
- [ ] B: prod CORS + auth verified against the release build on all four sites
