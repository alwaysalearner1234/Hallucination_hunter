# SETUP GUIDE — Hallucination Hunter

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | For mobile app |
| Python | 3.11+ | For backend |
| Docker | Latest | For PostgreSQL + Redis |
| Android Studio / Android SDK | Latest | For Android emulator |
| Expo Go app | Latest | For physical device testing |

---

## Step 1 — Get API Keys

### Google Gemini (LLM)
1. Go to https://aistudio.google.com
2. Click "Get API Key"
3. Create a new key — free tier supports ≈1500 requests/day

### Tavily Search (Evidence Retrieval)
1. Go to https://tavily.com
2. Sign up → Dashboard → API Keys
3. Copy your key — free tier: 1000 searches/month

---

## Step 2 — Configure Environment

```bash
cd hallucination-hunter
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY=AIza...your_key_here
TAVILY_API_KEY=tvly-...your_key_here
```

Keep all other defaults for local development.

---

## Step 3 — Start Database + Redis

```bash
# From the hallucination-hunter/ directory
docker-compose up postgres redis -d
```

Wait ~10 seconds, then verify:
```bash
docker-compose ps
# Both postgres and redis should show "healthy"
```

The database schema is applied automatically on first start via the init script.

---

## Step 4 — Start the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Install Tesseract OCR (for screenshot verification)
# Windows: https://github.com/UB-Mannheim/tesseract/wiki
# After installing, add to PATH or set in environment

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify it's running:
```
http://localhost:8000/docs       → Interactive API documentation
http://localhost:8000/api/v1/health → Health check
```

Expected health output:
```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok",
  "llm": "configured",
  "search": "configured"
}
```

---

## Step 5 — Start the Mobile App

```bash
cd mobile
npm install

# Start Expo dev server
npx expo start
```

### Android Emulator
```bash
npx expo start --android
```

### Physical Android Device
1. Install **Expo Go** from Google Play Store
2. Run `npx expo start`
3. Scan the QR code with the Expo Go app

### Find Your Backend URL
- **Android Emulator**: Use `http://10.0.2.2:8000` (maps to localhost)
- **Physical device**: Use your computer's local IP, e.g. `http://192.168.1.x:8000`

Update `mobile/services/api.ts`:
```typescript
const BASE_URL = __DEV__
  ? 'http://10.0.2.2:8000'   // Android emulator
  : 'https://your-production.com';
```

---

## Step 6 — Test the App

1. Open the app
2. Complete onboarding
3. Tap "Try Demo Verification"
4. Watch the live analysis stages
5. View results with trust score and claim verdicts

---

## Testing Share-to-Verify

1. Open ChatGPT, Gemini, or any browser
2. Generate an AI response
3. Long-press → Share
4. Select "Hallucination Hunter" from the share sheet
5. The app opens with the text pre-loaded

---

## Running Tests

### Backend tests
```bash
cd tests/backend
pip install pytest pytest-asyncio httpx
pytest test_api.py -v
```

### Agent tests
```bash
cd tests/agent
pytest test_agent.py -v
```

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `GEMINI_API_KEY not configured` | Check `.env` file exists and key is correct |
| `TAVILY_API_KEY not configured` | Check `.env` file and Tavily key |
| `Connection refused` on mobile | Update `api.ts` BASE_URL to your computer's IP |
| Database connection error | Make sure `docker-compose up postgres -d` is running |
| Redis connection error | Make sure `docker-compose up redis -d` is running |
| OCR not working | Install Tesseract OCR from https://github.com/UB-Mannheim/tesseract/wiki |
| Metro bundler error | Run `npx expo start --clear` to clear cache |
