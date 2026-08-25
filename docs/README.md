# Hallucination Hunter

**Claim-level AI trust verification. Verify AI responses with real evidence.**

> AI can sound confident even when it's wrong. Hallucination Hunter splits AI responses into individual factual claims, searches real web sources for evidence, verifies each claim, and gives you a transparent Trust Score — backed by real sources.

---

## What it does ::::

```
AI Response
→ Claim Extraction        (split into individual claims)
→ Evidence Retrieval      (real web search via Tavily)
→ Claim Verification      (LLM verifies using ONLY retrieved evidence)
→ Confidence Scoring      (source quality, count, agreement)
→ Trust Score             (weighted by importance + severity)
→ VERIFIED / FALSE / UNVERIFIABLE per claim
→ Source attribution + Corrections
```

## Features

| Feature | Status |
|---------|--------|
| Paste AI response | ✅ |
| Share-to-Verify (Android) | ✅ |
| Screenshot OCR | ✅ |
| Document upload (PDF/DOCX/TXT) | ✅ |
| Claim extraction | ✅ |
| Real evidence retrieval (Tavily) | ✅ |
| Source quality scoring | ✅ |
| Per-claim verdict (VERIFIED/FALSE/UNVERIFIABLE) | ✅ |
| Confidence score | ✅ |
| Trust Score | ✅ |
| Correction generation | ✅ |
| Verified Answer rewrite | ✅ |
| SSE real-time progress | ✅ |
| Verification history | ✅ |
| Guest mode | ✅ |
| Agent API for external AI | ✅ |
| Dark-mode professional UI | ✅ |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo (TypeScript) |
| Backend | Python FastAPI |
| AI / LLM | Google Gemini 1.5 Flash |
| Evidence | Tavily Search API |
| Database | PostgreSQL |
| Cache | Redis |
| OCR | Tesseract (pytesseract) |
| Auth | JWT (optional, guest-first) |
| Streaming | Server-Sent Events (SSE) |

## Quick Start

See [SETUP.md](SETUP.md) for full installation instructions.

```bash
# 1. Clone
git clone <repo>
cd hallucination-hunter

# 2. Configure
cp .env.example .env
# Edit .env with your API keys

# 3. Start database + Redis
docker-compose up postgres redis -d

# 4. Start backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# 5. Start mobile app
cd mobile && npm install
npx expo start --android
```

## Project Structure

```
hallucination-hunter/
├── mobile/          # React Native + Expo (TypeScript)
├── backend/         # Python FastAPI
├── agent/           # Modular verification agent (11 tools)
├── database/        # PostgreSQL migrations
├── tests/           # pytest + Jest tests
└── docs/            # Documentation
```

## API Keys Required

1. **Gemini API** (free tier): https://aistudio.google.com
2. **Tavily Search API** (free tier: 1000 searches/month): https://tavily.com

## Hackathon Position

> "Hallucination Hunter is a mobile AI trust layer that verifies AI-generated information at the individual claim level, retrieves supporting evidence, detects contradictions, assigns confidence scores, and gives users transparent source-backed results before they trust or share AI-generated information."

**Core differentiator: CLAIM-LEVEL AI TRUST VERIFICATION**

## License

MIT
