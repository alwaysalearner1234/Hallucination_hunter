# Hallucination Hunter — Browser Extension (MV3)

Browser extension for Chrome, Firefox, and Safari that verifies AI responses claim-by-claim with real evidence.

## Features

- **Right-click verification** — Select any AI response text and verify via context menu
- **Auto-detect buttons** — Inline "Verify" buttons appear on ChatGPT, Claude, Gemini, and Perplexity responses
- **Side panel** — Real-time verification progress and detailed results
- **Per-claim verdicts** — VERIFIED / FALSE / UNVERIFIABLE with confidence scores
- **Evidence with sources** — Real web sources with quality scores (0-100)
- **Corrections** — Evidence-based corrections for false claims
- **Trust Score** — Overall credibility score weighted by claim importance
- **History** — Local verification history with filtering
- **Keyboard shortcut** — `Ctrl+Shift+V` (Win/Linux) / `Cmd+Shift+V` (Mac) for quick verify

## Supported Platforms

| Platform | Context Menu | Inline Buttons | Page Verification |
|----------|--------------|----------------|-------------------|
| ChatGPT (chat.openai.com, chatgpt.com) | ✅ | ✅ | ✅ |
| Claude (claude.ai) | ✅ | ✅ | ✅ |
| Gemini (gemini.google.com, bard.google.com) | ✅ | ✅ | ✅ |
| Perplexity (perplexity.ai) | ✅ | ✅ | ✅ |
| Any page (selection) | ✅ | — | — |

## Installation

### Chrome/Edge (Developer Mode)

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder

### Firefox (Temporary)

1. Open `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select `extension/manifest.json`

### Safari (Web Extension)

1. Enable Develop menu: Safari → Settings → Advanced → "Show features for web developers"
2. Develop → Allow Unsigned Extensions
3. Use `xcrun safari-web-extension-converter` to convert for Safari

## Configuration

Click the extension icon → Settings (⚙️) to configure:

- **API URL** — Your backend endpoint (default: `https://api.truthlayer.example.com/api/v1`)
- **API Key** — Optional per-install key from backend
- **Default Mode** — Quick / Standard / Deep / Strict
- **Auto-open panel** — Open side panel automatically on verification
- **Notifications** — Show completion notifications

## Usage

### Quick Verify (Selection)
1. Select text on any AI response
2. Right-click → "Verify with Hallucination Hunter"
3. View results in side panel

### Inline Buttons
- Buttons automatically appear below AI responses on supported platforms
- Click to verify that specific response

### Page Verification
- Right-click on page → "Verify this page's AI content"
- Extension extracts latest AI response automatically

### Keyboard Shortcut
- Select text → Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)

## Architecture

```
extension/
├── manifest.json              # MV3 manifest
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Service worker (event handling, context menus)
│   ├── sidepanel/
│   │   ├── sidepanel.html     # Side panel UI
│   │   ├── sidepanel.ts       # Side panel logic
│   │   ├── claim-detail.html  # Claim detail view
│   │   └── claim-detail.ts    # Claim detail logic
│   ├── content/
│   │   └── adapters/          # Platform-specific content scripts
│   │       ├── chatgpt.js
│   │       ├── claude.js
│   │       ├── gemini.js
│   │       └── perplexity.js
│   ├── popup/
│   │   ├── popup.html         # Extension popup
│   │   ├── popup.ts           # Popup logic
│   │   └── welcome.html       # First-run welcome page
│   └── shared/
│       ├── api.ts             # Backend API client
│       ├── storage.ts         # Chrome storage utilities
│       ├── types.ts           # TypeScript types
│       └── constants.ts       # Shared constants
├── assets/
│   ├── icons/                 # Extension icons (16, 32, 48, 128)
│   └── styles/                # CSS files
└── scripts/
    └── generate-icons.js      # Icon generation helper
```

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5+
- Chrome/Edge for testing

### Build
```bash
cd extension
npm install
npm run build
```

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npx eslint src/**/*.ts
```

## Permissions (Minimal)

Following the principle of least privilege:

| Permission | Purpose |
|------------|---------|
| `contextMenus` | Right-click "Verify" menu |
| `storage` | Settings + local history |
| `sidePanel` | Results side panel |
| `activeTab` | Extract text from current tab |
| `scripting` | Inject content scripts |
| `host_permissions` | Only your API origin |

**No:** `tabs`, `webRequest`, `clipboardRead`, `<all_urls>`, background page (service worker only)

## API Integration

The extension communicates with the Hallucination Hunter backend:

- `POST /api/v1/verify` — Synchronous verification
- `POST /api/v1/verify/stream` — SSE streaming for real-time progress
- `GET /api/v1/history` — History (not used by extension, local only)
- `GET /api/v1/health` — Connection test

## Privacy

- **No tracking** — No analytics, no telemetry
- **Local-first** — History stored locally in browser
- **API keys** — Stored in Chrome sync storage (encrypted)
- **Guest mode** — Works without API key (rate limited)

## Building for Production

1. Update version in `manifest.json`
2. Generate icons: `node scripts/generate-icons.js`
3. Run TypeScript compilation: `npm run build`
4. Zip the `extension/` folder for Chrome Web Store submission
5. For Firefox: submit the same zip to AMO

## Troubleshooting

### Buttons not appearing on AI platforms
- Refresh the page
- Check DevTools console for errors
- Platform may have updated selectors — update adapter

### Verification fails
- Check API URL in settings
- Verify API key (if required)
- Check backend health: `GET /api/v1/health`

### Side panel doesn't open
- Ensure `sidePanel` permission granted
- Try clicking extension icon → "Open Panel"

## License

MIT — See LICENSE file