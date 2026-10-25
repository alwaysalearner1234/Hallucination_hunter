// sidepanel/sidepanel.ts - Side Panel Main Entry Point
import { api } from '../shared/api';
import { storage } from '../shared/storage';
import { VerificationResult, Claim, Verdict, VerificationStatus, ExtensionSettings } from '../shared/types';

// ─── State ──────────────────────────────────────────────────────────
interface SidePanelState {
  currentView: 'empty' | 'loading' | 'results' | 'history' | 'settings';
  currentResult: VerificationResult | null;
  history: VerificationResult[];
  settings: ExtensionSettings;
  filter: 'all' | Verdict;
}

let state: SidePanelState = {
  currentView: 'empty',
  currentResult: null,
  history: [],
  settings: {
    apiUrl: 'https://api.truthlayer.example.com/api/v1',
    apiKey: '',
    defaultMode: 'standard',
    autoOpenSidePanel: true,
    showNotifications: true,
  },
  filter: 'all',
};

// ─── DOM Elements ───────────────────────────────────────────────────
const elements = {
  mainContent: document.getElementById('main-content')!,
  emptyState: document.getElementById('empty-state')!,
  loadingState: document.getElementById('loading-state')!,
  resultsState: document.getElementById('results-state')!,
  historyView: document.getElementById('history-view')!,
  settingsView: document.getElementById('settings-view')!,
  loadingMessage: document.getElementById('loading-message')!,
  progressStages: document.getElementById('progress-stages')!,
  trustScoreGauge: document.getElementById('trust-score-gauge')!,
  trustScoreLabel: document.getElementById('trust-score-label')!,
  verificationTime: document.getElementById('verification-time')!,
  claimCount: document.getElementById('claim-count')!,
  breakdownPills: document.getElementById('breakdown-pills')!,
  filterTabs: document.getElementById('filter-tabs')!,
  claimsList: document.getElementById('claims-list')!,
  verifiedAnswerSection: document.getElementById('verified-answer-section')!,
  verifiedAnswerText: document.getElementById('verified-answer-text')!,
  historyList: document.getElementById('history-list')!,
  historyEmpty: document.getElementById('history-empty')!,
  settingsForm: document.getElementById('settings-form') as HTMLFormElement,
  apiUrlInput: document.getElementById('api-url') as HTMLInputElement,
  apiKeyInput: document.getElementById('api-key') as HTMLInputElement,
  defaultModeSelect: document.getElementById('default-mode') as HTMLSelectElement,
  autoOpenPanelCheckbox: document.getElementById('auto-open-panel') as HTMLInputElement,
  showNotificationsCheckbox: document.getElementById('show-notifications') as HTMLInputElement,
  verifyPageEnabledCheckbox: document.getElementById('verify-page-enabled') as HTMLInputElement,
  testConnectionBtn: document.getElementById('test-connection-btn')!,
  openDashboardBtn: document.getElementById('open-dashboard-btn')!,
  settingsBtn: document.getElementById('settings-btn')!,
  historyBtn: document.getElementById('history-btn')!,
  clearHistoryBtn: document.getElementById('clear-history-btn')!,
};

// ─── Constants ──────────────────────────────────────────────────────
const STAGES = [
  { key: 'extracting_claims', label: 'Extracting claims', icon: '📖' },
  { key: 'searching_evidence', label: 'Searching evidence', icon: '🔍' },
  { key: 'verifying_claim', label: 'Verifying claims', icon: '⚖️' },
  { key: 'calculating_trust', label: 'Calculating trust', icon: '📊' },
  { key: 'complete', label: 'Complete', icon: '✅' },
];

const VERDICT_CONFIG: Record<Verdict, { color: string; bg: string; border: string; label: string; icon: string }> = {
  VERIFIED: { color: '#10B981', bg: '#ECFDF5', border: '#10B981', label: 'Verified', icon: '✓' },
  FALSE: { color: '#EF4444', bg: '#FEF2F2', border: '#EF4444', label: 'False', icon: '✗' },
  UNVERIFIABLE: { color: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B', label: 'Unverifiable', icon: '?' },
};

const TRUST_SCORE_CONFIG = (score: number) => {
  if (score >= 80) return { label: 'High Trust', color: '#10B981' };
  if (score >= 60) return { label: 'Moderate Trust', color: '#F59E0B' };
  if (score >= 40) return { label: 'Low Trust', color: '#F97316' };
  return { label: 'Unreliable', color: '#EF4444' };
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#DC2626', bg: '#FEF2F2' },
  HIGH: { color: '#EF4444', bg: '#FEF2F2' },
  MEDIUM: { color: '#F59E0B', bg: '#FFFBEB' },
  LOW: { color: '#6B7280', bg: '#F3F4F6' },
};

// ─── Initialization ─────────────────────────────────────────────────
async function init(): Promise<void> {
  await loadSettings();
  await loadHistory();
  setupEventListeners();
  setupMessageListener();
  checkForPendingVerification();
  render();
}

async function loadSettings(): Promise<void> {
  state.settings = await api.getSettings();
  // Update form inputs
  elements.apiUrlInput.value = state.settings.apiUrl || '';
  elements.apiKeyInput.value = state.settings.apiKey || '';
  elements.defaultModeSelect.value = state.settings.defaultMode || 'standard';
  elements.autoOpenPanelCheckbox.checked = state.settings.autoOpenPanel ?? true;
  elements.showNotificationsCheckbox.checked = state.settings.showNotifications ?? true;
  elements.verifyPageEnabledCheckbox.checked = state.settings.verifyPageEnabled ?? true;
}

async function loadHistory(): Promise<void> {
  state.history = await storage.getHistory();
}

function setupEventListeners(): void {
  // Navigation
  elements.settingsBtn.addEventListener('click', () => switchView('settings'));
  elements.historyBtn.addEventListener('click', () => switchView('history'));
  elements.clearHistoryBtn.addEventListener('click', handleClearHistory);

  // Settings form
  elements.settingsForm.addEventListener('submit', handleSettingsSubmit);
  elements.testConnectionBtn.addEventListener('click', handleTestConnection);
  elements.openDashboardBtn.addEventListener('click', handleOpenDashboard);

  // Filter tabs
  elements.filterTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab') as HTMLButtonElement;
    if (tab) {
      state.filter = tab.dataset.filter as any;
      renderResults();
    }
  });

  // Claims list delegation
  elements.claimsList.addEventListener('click', (e) => {
    const claimCard = e.target.closest('.claim-card');
    if (claimCard) {
      const claimId = claimCard.dataset.claimId;
      if (claimId && state.currentResult) {
        const claim = state.currentResult.claims.find(c => c.id === claimId);
        if (claim) {
          openClaimDetail(claim);
        }
      }
    }
  });

  // History list delegation
  elements.historyList.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (item && !e.target.closest('.delete-btn')) {
      const id = item.dataset.verificationId;
      if (id) {
        const result = state.history.find(h => h.verification_id === id);
        if (result) {
          showResult(result);
        }
      }
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      const id = deleteBtn.dataset.verificationId;
      if (id) {
        handleDeleteHistory(id);
      }
    }
  });
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'VERIFICATION_PROGRESS':
        handleVerificationProgress(message.event);
        break;
      case 'VERIFICATION_COMPLETE':
        handleVerificationComplete(message.result);
        break;
    }
  });
}

function checkForPendingVerification(): void {
  // Check if there's a verification in progress from the background script
  chrome.runtime.sendMessage({ type: 'PING' }).catch(() => {});
}

// ─── View Management ────────────────────────────────────────────────
function switchView(view: SidePanelState['currentView']): void {
  state.currentView = view;
  render();
}

function render(): void {
  // Hide all views
  elements.emptyState.classList.add('hidden');
  elements.loadingState.classList.add('hidden');
  elements.resultsState.classList.add('hidden');
  elements.historyView.classList.add('hidden');
  elements.settingsView.classList.add('hidden');

  // Show current view
  switch (state.currentView) {
    case 'empty':
      elements.emptyState.classList.remove('hidden');
      break;
    case 'loading':
      elements.loadingState.classList.remove('hidden');
      break;
    case 'results':
      elements.resultsState.classList.remove('hidden');
      renderResults();
      break;
    case 'history':
      elements.historyView.classList.remove('hidden');
      renderHistory();
      break;
    case 'settings':
      elements.settingsView.classList.remove('hidden');
      break;
  }
}

// ─── Loading State ──────────────────────────────────────────────────
function handleVerificationProgress(event: any): void {
  const { event: eventName, data } = event;

  switch (eventName) {
    case 'stage_update':
      elements.loadingMessage.textContent = data.label || 'Processing...';
      updateProgressStages(data.stage);
      break;
    case 'claims_extracted':
      elements.loadingMessage.textContent = `Found ${data.count} claims. Searching evidence...`;
      updateProgressStages('searching_evidence');
      break;
    case 'claim_verified':
      elements.loadingMessage.textContent = `Verified ${data.claim_index + 1} of ${data.total} claims...`;
      updateProgressStages('verifying_claim');
      break;
    case 'trust_score_updated':
      updateProgressStages('calculating_trust');
      break;
    case 'complete':
      // Will be handled by VERIFICATION_COMPLETE message
      break;
    case 'error':
      showError(data.message || 'Verification failed');
      break;
  }
}

function updateProgressStages(currentStage: string): void {
  const currentIndex = STAGES.findIndex(s => s.key === currentStage);
  elements.progressStages.innerHTML = STAGES.map((stage, index) => {
    const isComplete = index < currentIndex;
    const isActive = index === currentIndex;
    return `
      <div class="progress-stage ${isComplete ? 'complete' : ''} ${isActive ? 'active' : ''}">
        <span class="stage-icon">${isComplete ? '✓' : stage.icon}</span>
        <span class="stage-label">${stage.label}</span>
      </div>
    `;
  }).join('');
}

function showError(message: string): void {
  switchView('empty');
  elements.emptyState.innerHTML = `
    <div class="empty-icon">⚠️</div>
    <h2>Verification Failed</h2>
    <p>${message}</p>
    <button class="primary-btn" onclick="location.reload()">Try Again</button>
  `;
}

// ─── Results Rendering ──────────────────────────────────────────────
function handleVerificationComplete(result: VerificationResult): void {
  state.currentResult = result;
  showResult(result);
}

function showResult(result: VerificationResult): void {
  state.currentResult = result;
  switchView('results');
}

function renderResults(): void {
  if (!state.currentResult) return;

  const result = state.currentResult;
  const config = TRUST_SCORE_CONFIG(result.trust_score ?? 0);

  // Trust Score Gauge
  renderTrustScoreGauge(result.trust_score ?? 0, config.color);
  elements.trustScoreLabel.textContent = config.label;
  elements.trustScoreLabel.style.color = config.color;

  // Meta
  elements.verificationTime.textContent = `${(result.processing_time_ms ?? 0) / 1000}s`;
  elements.claimCount.textContent = `${result.total_claims} claims`;

  // Breakdown pills
  elements.breakdownPills.innerHTML = `
    <div class="breakdown-pill verified">
      <span class="pill-icon">✓</span>
      <span class="pill-count">${result.verified}</span>
    </div>
    <div class="breakdown-pill false">
      <span class="pill-icon">✗</span>
      <span class="pill-count">${result.false}</span>
    </div>
    <div class="breakdown-pill unverifiable">
      <span class="pill-icon">?</span>
      <span class="pill-count">${result.unverifiable}</span>
    </div>
  `;

  // Claims
  renderClaims();

  // Verified Answer
  if (result.verified_answer) {
    elements.verifiedAnswerSection.classList.remove('hidden');
    elements.verifiedAnswerText.textContent = result.verified_answer;
  } else {
    elements.verifiedAnswerSection.classList.add('hidden');
  }
}

function renderTrustScoreGauge(score: number, color: string): void {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  elements.trustScoreGauge.innerHTML = `
    <svg width="120" height="120" class="gauge-svg">
      <circle
        cx="60" cy="60" r="${radius}"
        fill="none"
        stroke="#E5E7EB"
        stroke-width="10"
      />
      <circle
        cx="60" cy="60" r="${radius}"
        fill="none"
        stroke="${color}"
        stroke-width="10"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        class="gauge-progress"
        style="transform: rotate(-90deg); transform-origin: 60px 60px;"
      />
      <text x="60" y="68" text-anchor="middle" class="gauge-text" fill="${color}" font-size="28" font-weight="800">${score}</text>
      <text x="60" y="90" text-anchor="middle" class="gauge-subtext" fill="#9CA3AF" font-size="10">/100</text>
    </svg>
  `;
}

function renderClaims(): void {
  if (!state.currentResult) return;

  const filteredClaims = state.filter === 'all'
    ? state.currentResult.claims
    : state.currentResult.claims.filter(c => c.verdict === state.filter);

  // Update filter tab counts
  document.querySelectorAll('.filter-tab').forEach(tab => {
    const filter = tab.dataset.filter;
    let count = 0;
    if (filter === 'all') count = state.currentResult!.total_claims;
    else if (filter === 'VERIFIED') count = state.currentResult!.verified;
    else if (filter === 'FALSE') count = state.currentResult!.false;
    else if (filter === 'UNVERIFIABLE') count = state.currentResult!.unverifiable;
    tab.innerHTML = `${tab.textContent?.split('(')[0].trim()} (${count})`;
  });

  if (filteredClaims.length === 0) {
    elements.claimsList.innerHTML = `
      <div class="no-claims">
        <p>No claims in this category</p>
      </div>
    `;
    return;
  }

  elements.claimsList.innerHTML = filteredClaims.map(claim => renderClaimCard(claim)).join('');
}

function renderClaimCard(claim: Claim): string {
  const verdictConfig = claim.verdict ? VERDICT_CONFIG[claim.verdict] : { color: '#9CA3AF', bg: '#F3F4F6', border: '#D1D5DB', label: '—', icon: '—' };
  const confidence = claim.confidence ?? 0;
  const confidenceColor = confidence >= 80 ? '#10B981' : confidence >= 50 ? '#F59E0B' : '#EF4444';
  const hasEvidence = claim.evidence && claim.evidence.length > 0;
  const evidencePreview = hasEvidence ? claim.evidence[0].snippet.slice(0, 120) + '...' : null;
  const sourceCount = claim.evidence?.length ?? 0;

  return `
    <div class="claim-card" data-claim-id="${claim.id}">
      <div class="claim-header">
        ${claim.verdict ? `
          <div class="verdict-badge" style="background: ${verdictConfig.bg}; border-color: ${verdictConfig.border}; color: ${verdictConfig.color};">
            <span class="verdict-icon">${verdictConfig.icon}</span>
            <span class="verdict-label">${verdictConfig.label}</span>
          </div>
        ` : ''}
        ${claim.severity && claim.verdict !== 'VERIFIED' ? `
          <div class="severity-badge" style="background: ${SEVERITY_CONFIG[claim.severity]?.bg}; color: ${SEVERITY_CONFIG[claim.severity]?.color};">
            ${claim.severity}
          </div>
        ` : ''}
        <span class="confidence" style="color: ${confidenceColor};">${confidence}%</span>
      </div>
      <p class="claim-text">${escapeHtml(claim.text)}</p>
      ${evidencePreview ? `
        <div class="evidence-preview">
          <span class="evidence-label">Evidence</span>
          <span class="evidence-text">"${escapeHtml(evidencePreview)}"</span>
        </div>
      ` : ''}
      ${claim.correction ? `
        <div class="correction-box">
          <span class="correction-label">✏ Correction</span>
          <span class="correction-text">${escapeHtml(claim.correction)}</span>
        </div>
      ` : ''}
      <div class="claim-footer">
        <div class="claim-meta">
          <span class="claim-type">${(claim.claim_type ?? 'general').replace(/_/g, ' ').toUpperCase()}</span>
          ${sourceCount > 0 ? `<span class="source-count">${sourceCount} source${sourceCount !== 1 ? 's' : ''}</span>` : ''}
        </div>
        <button class="detail-btn">Details →</button>
      </div>
    </div>
  `;
}

function openClaimDetail(claim: Claim): void {
  // Open in new tab with detail view
  const url = chrome.runtime.getURL(`src/sidepanel/claim-detail.html?claim=${encodeURIComponent(JSON.stringify(claim))}`);
  chrome.tabs.create({ url });
}

// ─── History Rendering ──────────────────────────────────────────────
function renderHistory(): void {
  if (state.history.length === 0) {
    elements.historyList.innerHTML = '';
    elements.historyEmpty.classList.remove('hidden');
    return;
  }

  elements.historyEmpty.classList.add('hidden');
  elements.historyList.innerHTML = state.history.map(item => renderHistoryItem(item)).join('');
}

function renderHistoryItem(item: VerificationResult): string {
  const score = item.trust_score;
  const scoreConfig = score !== undefined ? TRUST_SCORE_CONFIG(score) : null;
  const date = new Date(item.created_at);

  return `
    <div class="history-item" data-verification-id="${item.verification_id}">
      <div class="history-score" style="border-color: ${scoreConfig ? `${scoreConfig.color}40` : 'var(--border-color)'};">
        ${score !== undefined ? `<span style="color: ${scoreConfig!.color}">${score}</span>` : '—'}
      </div>
      <div class="history-info">
        <div class="history-date">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="history-stats">
          ${item.total_claims} claims
          ${item.verified > 0 ? ` · ✅ ${item.verified}` : ''}
          ${item.false > 0 ? ` · ❌ ${item.false}` : ''}
          ${item.unverifiable > 0 ? ` · ❓ ${item.unverifiable}` : ''}
        </div>
      </div>
      <button class="delete-btn" data-verification-id="${item.verification_id}" title="Delete">🗑</button>
    </div>
  `;
}

async function handleDeleteHistory(id: string): Promise<void> {
  await storage.deleteVerification(id);
  state.history = state.history.filter(h => h.verification_id !== id);
  renderHistory();
}

async function handleClearHistory(): Promise<void> {
  if (confirm('Clear all verification history?')) {
    await storage.clearHistory();
    state.history = [];
    renderHistory();
  }
}

// ─── Settings ───────────────────────────────────────────────────────
async function handleSettingsSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const settings: Partial<ExtensionSettings> = {
    apiUrl: elements.apiUrlInput.value.trim(),
    apiKey: elements.apiKeyInput.value.trim() || undefined,
    defaultMode: elements.defaultModeSelect.value as any,
    autoOpenSidePanel: elements.autoOpenPanelCheckbox.checked,
    showNotifications: elements.showNotificationsCheckbox.checked,
    verifyPageEnabled: elements.verifyPageEnabledCheckbox.checked,
  };

  await api.saveSettings(settings);
  state.settings = { ...state.settings, ...settings } as ExtensionSettings;

  showToast('Settings saved');
}

async function handleTestConnection(): Promise<void> {
  elements.testConnectionBtn.disabled = true;
  elements.testConnectionBtn.textContent = 'Testing...';

  try {
    const health = await api.health();
    if (health.status === 'ok') {
      showToast(`Connected! LLM: ${health.llm}, Search: ${health.search}`);
    } else {
      showToast('Connection failed: ' + health.status, true);
    }
  } catch (error) {
    showToast('Connection failed: ' + getErrorMessage(error), true);
  } finally {
    elements.testConnectionBtn.disabled = false;
    elements.testConnectionBtn.textContent = 'Test Connection';
  }
}

function handleOpenDashboard(): void {
  chrome.tabs.create({ url: state.settings.apiUrl.replace('/api/v1', '') });
}

// ─── Helpers ────────────────────────────────────────────────────────
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

function showToast(message: string, isError = false): void {
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── Start ──────────────────────────────────────────────────────────
init();