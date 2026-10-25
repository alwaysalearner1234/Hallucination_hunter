// sidepanel/claim-detail.js - Claim Detail Page
import { VERDICT_CONFIG } from '../shared/constants';

const VERDICT_COLORS = {
  VERIFIED: { color: '#10B981', bg: '#ECFDF5', border: '#10B981', label: 'Verified', icon: '✓' },
  FALSE: { color: '#EF4444', bg: '#FEF2F2', border: '#EF4444', label: 'False', icon: '✗' },
  UNVERIFIABLE: { color: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B', label: 'Unverifiable', icon: '?' },
};

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#DC2626', bg: '#FEF2F2' },
  HIGH: { color: '#EF4444', bg: '#FEF2F2' },
  MEDIUM: { color: '#F59E0B', bg: '#FFFBEB' },
  LOW: { color: '#6B7280', bg: '#F3F4F6' },
};

function init() {
  parseClaimFromURL();
  setupEventListeners();
  renderClaim();
}

function parseClaimFromURL() {
  const params = new URLSearchParams(window.location.search);
  const claimStr = params.get('claim');
  if (claimStr) {
    try {
      window.claimData = JSON.parse(decodeURIComponent(claimStr));
    } catch (e) {
      console.error('Failed to parse claim:', e);
      window.claimData = null;
    }
  }
}

function setupEventListeners() {
  document.getElementById('back-btn').addEventListener('click', () => {
    window.history.back();
  });
}

function renderClaim() {
  const claim = window.claimData;
  if (!claim) {
    document.body.innerHTML = '<div class="error">Claim not found</div>';
    return;
  }

  // Claim text
  document.getElementById('claim-text').textContent = claim.text || '';

  // Verdict badge
  const verdictConfig = claim.verdict ? VERDICT_COLORS[claim.verdict] : null;
  const verdictBadge = document.getElementById('verdict-badge');
  if (verdictConfig) {
    verdictBadge.style.background = verdictConfig.bg;
    verdictBadge.style.borderColor = verdictConfig.border;
    verdictBadge.querySelector('.verdict-icon').textContent = verdictConfig.icon;
    verdictBadge.querySelector('.verdict-label').textContent = verdictConfig.label;
    verdictBadge.querySelector('.verdict-label').style.color = verdictConfig.color;
    verdictBadge.querySelector('.verdict-icon').style.color = verdictConfig.color;
  } else {
    verdictBadge.style.display = 'none';
  }

  // Confidence
  const confidence = claim.confidence ?? 0;
  const confidenceColor = confidence >= 80 ? '#10B981' : confidence >= 50 ? '#F59E0B' : '#EF4444';
  const confidenceBox = document.getElementById('confidence-box');
  confidenceBox.querySelector('.confidence-value').textContent = `${confidence}%`;
  confidenceBox.querySelector('.confidence-value').style.color = confidenceColor;

  // Severity
  if (claim.severity && claim.verdict !== 'VERIFIED') {
    const severityConfig = SEVERITY_CONFIG[claim.severity];
    const severityBox = document.getElementById('severity-box');
    severityBox.style.display = 'inline-flex';
    severityBox.style.background = severityConfig.bg;
    severityBox.querySelector('.severity-value').textContent = claim.severity;
    severityBox.querySelector('.severity-value').style.color = severityConfig.color;
    severityBox.querySelector('.severity-label').style.color = severityConfig.color;
  }

  // Meta
  document.getElementById('claim-type').textContent = (claim.claim_type ?? 'general').replace(/_/g, ' ');
  document.getElementById('claim-importance').textContent = (claim.importance ?? 'medium').toUpperCase();

  // Reasoning
  if (claim.reasoning) {
    document.getElementById('reasoning-section').style.display = 'block';
    document.getElementById('reasoning-text').textContent = claim.reasoning;
  }

  // Correction
  if (claim.correction) {
    document.getElementById('correction-section').style.display = 'block';
    document.getElementById('correction-original').textContent = claim.text || '';
    document.getElementById('correction-text').textContent = claim.correction;
    if (claim.correction_evidence) {
      document.getElementById('correction-evidence-box').style.display = 'block';
      document.getElementById('correction-evidence-text').textContent = claim.correction_evidence;
    }
  }

  // Evidence
  renderEvidence(claim.evidence);
}

function renderEvidence(evidence) {
  const list = document.getElementById('evidence-list');
  const countEl = document.getElementById('evidence-count');
  const noEvidence = list.querySelector('.no-evidence');

  if (!evidence || evidence.length === 0) {
    noEvidence.style.display = 'block';
    countEl.textContent = '0';
    return;
  }

  noEvidence.style.display = 'none';
  countEl.textContent = evidence.length;

  list.innerHTML = evidence.map((ev, i) => renderEvidenceItem(ev, i)).join('');

  // Add click handlers for open source buttons
  list.querySelectorAll('.open-source-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.dataset.url;
      if (url) {
        chrome.tabs.create({ url });
      }
    });
  });
}

function renderEvidenceItem(ev, index) {
  const source = ev.source || {};
  const qualityScore = source.quality_score ?? 0;
  const qualityColor = qualityScore >= 70 ? '#10B981' : qualityScore >= 40 ? '#F59E0B' : '#EF4444';

  return `
    <div class="evidence-item">
      <p class="evidence-snippet">"${escapeHtml(ev.snippet || '')}"</p>
      <div class="evidence-source">
        <div class="source-info">
          <p class="source-title" title="${escapeHtml(source.title || source.url || 'Unknown')}">${escapeHtml(source.title || source.url || 'Unknown')}</p>
          ${source.publisher ? `<p class="source-publisher">${escapeHtml(source.publisher)}</p>` : ''}
        </div>
        <div class="source-quality">
          <span class="quality-score" style="color: ${qualityColor};">${qualityScore}</span>
          <span class="quality-label">/100</span>
        </div>
      </div>
      ${source.quality_reasons && source.quality_reasons.length > 0 ? `
        <div class="quality-reasons">
          ${source.quality_reasons.slice(0, 3).map(r => `<span class="reason-chip">${escapeHtml(r)}</span>`).join('')}
        </div>
      ` : ''}
      <button class="open-source-btn" data-url="${escapeHtml(source.url || '#')}">Open Source →</button>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

init();