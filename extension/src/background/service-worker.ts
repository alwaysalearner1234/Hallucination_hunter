// background/service-worker.ts - MV3 Service Worker
import { api } from '../shared/api';
import { storage } from '../shared/storage';
import { VerificationResult, VerifyRequest, ExtensionSettings } from '../shared/types';

// ─── Constants ──────────────────────────────────────────────────────
const CONTEXT_MENU_ID = 'hh-verify-selection';
const CONTEXT_MENU_ID_PAGE = 'hh-verify-page';

// ─── Install / Startup ──────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[HH] Extension installed', details.reason);

  // Create context menus
  await createContextMenus();

  // Set default settings if not exist
  const settings = await api.getSettings();
  if (!settings.apiUrl) {
    await api.saveSettings({
      apiUrl: 'https://api.truthlayer.example.com/api/v1',
      defaultMode: 'standard',
      autoOpenSidePanel: true,
      showNotifications: true,
    });
  }

  if (details.reason === 'install') {
    // Open welcome page on install
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/popup/welcome.html'),
    });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await createContextMenus();
});

// ─── Context Menus ──────────────────────────────────────────────────
async function createContextMenus(): Promise<void> {
  try {
    await chrome.contextMenus.removeAll();
  } catch {
    // Ignore if no menus exist
  }

  // Right-click on selected text
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Verify with Hallucination Hunter',
    contexts: ['selection'],
    documentUrlPatterns: ['<all_urls>'],
  });

  // Right-click on page (no selection)
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID_PAGE,
    title: 'Verify this page\'s AI content',
    contexts: ['page'],
    documentUrlPatterns: ['https://chat.openai.com/*', 'https://chatgpt.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*', 'https://bard.google.com/*', 'https://www.perplexity.ai/*'],
  });

  // Parent menu for AI platforms
  chrome.contextMenus.create({
    id: 'hh-parent',
    title: 'Hallucination Hunter',
    contexts: ['page', 'selection'],
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  try {
    if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
      await handleVerifySelection(info.selectionText, tab.id);
    } else if (info.menuItemId === CONTEXT_MENU_ID_PAGE) {
      await handleVerifyPage(tab.id);
    }
  } catch (error) {
    console.error('[HH] Context menu error:', error);
    showNotification('Verification failed', 'Could not start verification. Check your connection.');
  }
});

// ─── Message Handling ───────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): Promise<void> {
  try {
    switch (message.type) {
      case 'VERIFY_TEXT': {
        const result = await verifyText(message.text, message.mode, sender.tab?.id);
        sendResponse({ success: true, result });
        break;
      }

      case 'GET_HISTORY': {
        const history = await storage.getHistory();
        sendResponse({ success: true, history });
        break;
      }

      case 'DELETE_HISTORY': {
        await storage.deleteVerification(message.id);
        sendResponse({ success: true });
        break;
      }

      case 'CLEAR_HISTORY': {
        await storage.clearHistory();
        sendResponse({ success: true });
        break;
      }

      case 'GET_SETTINGS': {
        const settings = await api.getSettings();
        sendResponse({ success: true, settings });
        break;
      }

      case 'SAVE_SETTINGS': {
        await api.saveSettings(message.settings);
        sendResponse({ success: true });
        break;
      }

      case 'OPEN_SIDE_PANEL': {
        if (sender.tab?.id) {
          await chrome.sidePanel.open({ tabId: sender.tab.id });
        }
        sendResponse({ success: true });
        break;
      }

      case 'PING': {
        sendResponse({ success: true, pong: true });
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[HH] Message handler error:', error);
    sendResponse({ success: false, error: getErrorMessage(error) });
  }
}

// ─── Verification Logic ─────────────────────────────────────────────
async function verifyText(
  text: string,
  mode?: string,
  tabId?: number
): Promise<VerificationResult> {
  const settings = await api.getSettings();

  const request: VerifyRequest = {
    text,
    mode: (mode as any) || settings.defaultMode,
    source_type: 'extension',
    guest_id: await getGuestId(),
  };

  // Use streaming verification for real-time updates
  const result = await new Promise<VerificationResult>((resolve, reject) => {
    const events: any[] = [];

    api.verify(request).then(resolve).catch(reject);

    // Also try streaming for progress updates
    verifyWithStream(request, (event) => {
      events.push(event);
      // Forward progress to side panel if open
      chrome.runtime.sendMessage({
        type: 'VERIFICATION_PROGRESS',
        event,
      }).catch(() => {}); // Ignore if no listener
    }).catch(() => {}); // Fallback handled by sync verify
  });

  // Save to history
  await storage.saveVerification(result);

  // Show notification if enabled
  if (settings.showNotifications) {
    showVerificationNotification(result);
  }

  // Open side panel with results if enabled
  if (settings.autoOpenSidePanel && tabId) {
    await chrome.sidePanel.open({ tabId });
    // Send result to side panel
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'VERIFICATION_COMPLETE',
        result,
      }).catch(() => {});
    }, 500);
  }

  return result;
}

async function handleVerifySelection(text: string, tabId: number): Promise<void> {
  if (!text || text.trim().length < 20) {
    showNotification('Text too short', 'Please select more text to verify (minimum 20 characters).');
    return;
  }

  // Show loading notification
  showNotification('Verifying...', 'Checking claims against real sources.');

  try {
    await verifyText(text.trim(), undefined, tabId);
  } catch (error) {
    showNotification('Verification failed', getErrorMessage(error));
  }
}

async function handleVerifyPage(tabId: number): Promise<void> {
  // Inject content script to extract AI responses from the page
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractAIResponsesFromPage,
    });

    const responses = results[0]?.result;
    if (!responses || responses.length === 0) {
      showNotification('No AI content found', 'Could not detect AI responses on this page.');
      return;
    }

    // If multiple responses, let user choose or verify the latest
    const text = responses[responses.length - 1];
    await handleVerifySelection(text, tabId);
  } catch (error) {
    console.error('[HH] Page verification error:', error);
    showNotification('Verification failed', 'Could not extract content from page.');
  }
}

// ─── Helper Functions ───────────────────────────────────────────────
function getGuestId(): string {
  // This will be synced from storage in the actual implementation
  return `ext_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function showNotification(title: string, message: string): void {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon48.png',
    title,
    message,
    priority: 1,
  });
}

function showVerificationNotification(result: VerificationResult): void {
  const { trust_score, verified, false: falseCount, unverifiable } = result;
  const score = trust_score ?? 0;

  let message = `Trust Score: ${score}/100`;
  if (verified) message += ` | ✅ ${verified} verified`;
  if (falseCount) message += ` | ❌ ${falseCount} false`;
  if (unverifiable) message += ` | ❓ ${unverifiable} unverifiable`;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon48.png',
    title: 'Verification Complete',
    message,
    priority: 2,
    buttons: [{ title: 'View Details' }],
  });
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // Open side panel or popup
    chrome.action.openPopup();
  }
});

// ─── Stream Verification (re-exported from api) ─────────────────────
async function verifyWithStream(
  request: VerifyRequest,
  onProgress: (event: any) => void,
  signal?: AbortSignal
): Promise<void> {
  const settings = await api.getSettings();
  const baseUrl = settings.apiUrl || 'https://api.truthlayer.example.com/api/v1';
  const url = `${baseUrl}/verify/stream`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (settings.apiKey) {
    headers['X-API-Key'] = settings.apiKey;
  }

  const guestId = await getGuestId();
  headers['X-Guest-ID'] = guestId;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...request, guest_id: guestId, mode: request.mode || settings.defaultMode }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Stream failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          onProgress(data);
        } catch {
          // Skip malformed SSE events
        }
      }
    }
  }
}

// ─── Content Script Helper (injected) ───────────────────────────────
function extractAIResponsesFromPage(): string[] {
  // This runs in the page context
  const responses: string[] = [];

  // ChatGPT
  document.querySelectorAll('[data-message-author-role="assistant"]').forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length > 50) responses.push(text);
  });

  // Claude
  document.querySelectorAll('.font-claude-message, [data-testid="assistant-message"]').forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length > 50) responses.push(text);
  });

  // Gemini
  document.querySelectorAll('.model-response-text, [data-response-index]').forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length > 50) responses.push(text);
  });

  // Perplexity
  document.querySelectorAll('[data-testid="answer-content"], .prose').forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length > 50) responses.push(text);
  });

  return responses;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// ─── Side Panel Communication ───────────────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    port.onMessage.addListener((message) => {
      if (message.type === 'GET_HISTORY') {
        storage.getHistory().then(history => {
          port.postMessage({ type: 'HISTORY', history });
        });
      }
    });
  }
});

// ─── Keyboard Shortcut ──────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'verify-selection') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || '',
      }).then(results => {
        const text = results[0]?.result;
        if (text && text.trim().length >= 20) {
          handleVerifySelection(text.trim(), tab.id!);
        }
      });
    }
  }
});

console.log('[HH] Service worker loaded');