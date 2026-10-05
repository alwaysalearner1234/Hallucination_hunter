# Hallucination Hunter (TruthLayer)

Claim-level AI trust verification. Paste an AI answer, get per-claim
`VERIFIED / FALSE / UNVERIFIABLE` verdicts with real sources and a Trust Score.

## One-command backend (API + Postgres + Redis)

```bash
docker compose up --build
```

- API: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

No `.env` needed to boot. For real LLM/search results, copy keys first:

```bash
cp .env.example .env   # fill in GEMINI_API_KEY + TAVILY_API_KEY
docker compose up --build
```

Without keys the API still boots; `/api/v1/health` reports
`llm: not_configured` / `search: not_configured`.

## Tests

```bash
pip install -r backend/requirements.txt
pytest
```

## Docs

- `docs/README.md` — features and project structure
- `docs/SETUP.md` — full local setup (mobile app, OCR, troubleshooting)
- `docs/ARCHITECTURE.md` — pipeline and design decisions
- `docs/api-contract.md` — API contract v2 (schemas + SSE events)
