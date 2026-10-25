// popup/popup.js - Extension Popup Script
import { api } from '../shared/api';
import { storage } from '../shared/storage';
import { VerificationResult } from '../shared/types';

// ─── DOM Elements ───────────────────────────────────────────────────
const elements = {
  statusIndicator: document.getElementById('status-indicator'),
  statusDot: document.querySelector('.status-dot'),
  statusText: document.querySelector('.status-text'),
  verifyText: document.getElementById('verify-text'),
  charCount: document.getElementById('char-count'),
  verifyMode: document.getElementById('verify-mode'),
  verifyBtn: document.getElementById('verify-btn'),
  btnText: document.querySelector('.btn-text'),
  btnLoader: document.querySelector('.btn-loader'),
  errorMessage: document.getElementById('error-message'),
  recentSection: document.getElementById('recent-section'),
  recentCard: document.getElementById('recent-card'),
  verifySelectionBtn: document.getElementById('verify-selection-btn'),
  verifyPageBtn: document.getElementById('verify-page-btn'),
  openSidepanelBtn: document.getElementById('open-sidepanel-btn'),
  openDashboardBtn: document.getElementById('open-dashboard-btn'),
  viewFullBtn: document.getElementById('view-full-btn'),
  settingsLink: document.getElementById('settings-link'),
  helpLink: document.getElementById('help-link'),
};

// ─── State ──────────────────────────────────────────────────────────
let settings = null;
let recentVerification = null;

// ─── Constants ──────────────────────────────────────────────────────
const TRUST_SCORE_CONFIG = (score) => {
  if (score >= 80) return { label: 'High Trust', color: '#10B981' };
  if (score >= 60) return { label: 'Moderate Trust', color: '#F59E0B' };
  if (score >= 40) return { label: 'Low Trust', color: '#F97316' };
  return { label: 'Unreliable', color: '#EF4444' };
};

const VERDICT_COLORS = {
  VERIFIED: '#10B981',
  FALSE: '#EF4444',
  UNVERIFIABLE: '#F59E0B',
};

// ─── Initialization ─────────────────────────────────────────────────
async function init() {
  await loadSettings();
  await loadRecentVerification();
  setupEventListeners();
  checkConnection();
  renderRecentVerification();
}

async function loadSettings() {
  settings = await api.getSettings();
  elements.verifyMode.value = settings.defaultMode || 'standard';
}

async function loadRecentVerification() {
  const history = await storage.getHistory();
  if (history.length > 0) {
    recentVerification = history[0];
  }
}

function setupEventListeners() {
  // Text input
  elements.verifyText.addEventListener('input', handleTextInput);

  // Verify button
  elements.verifyBtn.addEventListener('click', handleVerify);

  // Quick actions
  elements.verifySelectionBtn.addEventListener('click', handleVerifySelection);
  elements.verifyPageBtn.addEventListener('click', handleVerifyPage);
  elements.openSidepanelBtn.addEventListener('click', handleOpenSidepanel);
  elements.openDashboardBtn.addEventListener('click', handleOpenDashboard);
  elements.viewFullBtn.addEventListener('click', handleViewFull);
  elements.settingsLink.addEventListener('click', handleOpenSettings);
  elements.helpLink.addEventListener('click', handleOpenHelp);
}

async function checkConnection() {
  try {
    const health = await api.health();
    setConnectionStatus(health.status === 'ok', health.status === 'ok' ? 'Connected' : 'Degraded');
  } catch (error) {
    setConnectionStatus(false, 'Offline');
  }
}

function setConnectionStatus(connected, text) {
  elements.statusDot.style.background = connected ? '#10B981' : '#EF4444';
  elements.statusText.textContent = text;
}

// ─── Event Handlers ─────────────────────────────────────────────────
function handleTextInput() {
  const text = elements.verifyText.value;
  const count = text.length;
  elements.charCount.textContent = count.toLocaleString();
  elements.verifyBtn.disabled = count === 0 || count > 50000;
  hideError();
}

async function handleVerify() {
  const text = elements.verifyText.value.trim();
  if (!text || text.length < 20) {
    showError('Please enter at least 20 characters');
    return;
  }
  if (text.length > 50000) {
    showError('Text too long (max 50,000 characters)');
    return;
  }

  setLoading(true);
  hideError();

  try {
    const result = await api.verify({
      text,
      mode: elements.verifyMode.value,
      source_type: 'extension',
    });

    recentVerification = result;
    await storage.saveVerification(result);
    renderRecentVerification();
    elements.recentSection.style.display = 'block';

    // Open side panel
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });

    // Clear input
    elements.verifyText.value = '';
    elements.charCount.textContent = '0';
    elements.verifyBtn.disabled = true;

    showToast('Verification complete!');
  } catch (error) {
    showError('Verification failed: ' + getErrorMessage(error));
  } finally {
    setLoading(false);
  }
}

async function handleVerifySelection() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || '',
    });

    const text = results[0]?.result;
    if (text && text.trim().length >= 20) {
      window.close(); // Close popup
      chrome.runtime.sendMessage({
        type: 'VERIFY_TEXT',
        text: text.trim(),
        mode: settings.defaultMode || 'standard',
      });
    } else {
      showError('Please select more text (minimum 20 characters)');
    }
  } catch (error) {
    showError('Could not get selection: ' + getErrorMessage(error));
  }
}

async function handleVerifyPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  window.close();
  chrome.runtime.sendMessage({ type: 'VERIFY_PAGE', tabId: tab.id });
}

function handleOpenSidepanel() {
  chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
  window.close();
}

function handleOpenDashboard() {
  const url = (settings?.apiUrl || 'https://api.truthlayer.example.com/api/v1').replace('/api/v1', '');
  chrome.tabs.create({ url });
  window.close();
}

function handleViewFull() {
  if (recentVerification) {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'SHOW_HISTORY_ITEM',
        id: recentVerification.verification_id,
      });
    }, 500);
  }
  window.close();
}

function handleOpenSettings(e) {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', view: 'settings' });
  window.close();
}

function handleOpenHelp(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://truthlayer.example.com/docs' });
  window.close();
}

// ─── Rendering ──────────────────────────────────────────────────────
function renderRecentVerification() {
  if (!recentVerification) {
    elements.recentSection.style.display = 'none';
    return;
  }

  const result = recentVerification;
  const config = TRUST_SCORE_CONFIG(result.trust_score ?? 0);

  elements.recentCard.innerHTML = `
    <div class="recent-score" style="border-color: ${config.color}40;">
      <span class="score-value" style="color: ${config.color};">${result.trust_score ?? '—'}</span>
      <span class="score-label">${config.label}</span>
    </div>
    <div class="recent-breakdown">
      <span class="breakdown-item verified">✅ ${result.verified}</span>
      <span class="breakdown-item false">❌ ${result.false}</span>
      <span class="breakdown-item unverifiable">❓ ${result.unverifiable}</span>
    </div>
    <div class="recent-meta">
      ${result.total_claims} claims · ${Math.round((result.processing_time_ms ?? 0) / 1000)}s
    </div>
  `;
}

// ─── Helpers ────────────────────────────────────────────────────────
function setLoading(loading) {
  elements.verifyBtn.disabled = loading || elements.verifyText.value.length === 0;
  elements.btnText.classList.toggle('hidden', loading);
  elements.btnLoader.classList.toggle('hidden', !loading);
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
}

function hideError() {
  elements.errorMessage.classList.add('hidden');
}

function showToast(message) {
  // Create toast in popup
  const toast = document.createElement('div');
  toast.className = 'popup-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// ─── Start ──────────────────────────────────────────────────────────
init();