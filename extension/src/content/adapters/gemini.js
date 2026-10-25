// content/adapters/gemini.js - Gemini Content Script Adapter
(function() {
  'use strict';

  const PLATFORM = 'gemini';
  let observer = null;
  let processedElements = new WeakSet();

  // Selectors for Gemini
  const SELECTORS = {
    // Model response containers
    message: '.model-response-text, [data-response-index], .response-container, .message-content',
    // Alternative selectors
    messageAlt: '[class*="model"][class*="response"], [class*="assistant"][class*="message"]',
    // Content
    messageContent: '.markdown, .prose, [class*="content"]',
    // Code blocks
    codeBlock: 'pre, code, .code-block, [class*="code"]',
  };

  function init() {
    console.log('[HH] Gemini adapter initialized');
    startObserving();
    processExistingMessages();
  }

  function startObserving() {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            checkForAssistantMessages(node);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function checkForAssistantMessages(root) {
    let messages = [];

    if (root.querySelectorAll) {
      messages = Array.from(root.querySelectorAll(SELECTORS.message));
    }

    if (messages.length === 0 && root.querySelectorAll) {
      messages = Array.from(root.querySelectorAll(SELECTORS.messageAlt));
    }

    if (root.matches && (root.matches(SELECTORS.message) || root.matches(SELECTORS.messageAlt))) {
      messages.unshift(root);
    }

    messages.forEach(processMessage);
  }

  function processExistingMessages() {
    let messages = document.querySelectorAll(SELECTORS.message);
    if (messages.length === 0) {
      messages = document.querySelectorAll(SELECTORS.messageAlt);
    }
    messages.forEach(processMessage);
  }

  function processMessage(messageEl) {
    if (processedElements.has(messageEl)) return;
    processedElements.add(messageEl);

    let contentEl = messageEl.querySelector(SELECTORS.messageContent);
    if (!contentEl) contentEl = messageEl;

    const text = extractText(contentEl);
    if (!text || text.trim().length < 50) return;

    if (messageEl.querySelector('.hh-verify-btn')) return;

    injectVerifyButton(messageEl, contentEl, text);
  }

  function extractText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll(SELECTORS.codeBlock).forEach(el => el.remove());
    return clone.textContent?.trim() || '';
  }

  function injectVerifyButton(messageEl, contentEl, text) {
    const container = document.createElement('div');
    container.className = 'hh-verify-container';
    container.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);';

    const btn = document.createElement('button');
    btn.className = 'hh-verify-btn';
    btn.textContent = 'Verify with Hallucination Hunter';
    btn.dataset.hhText = text;
    btn.addEventListener('click', handleVerifyClick);

    container.appendChild(btn);

    contentEl.parentNode?.insertBefore(container, contentEl.nextSibling);
  }

  async function handleVerifyClick(event) {
    const btn = event.currentTarget;
    const text = btn.dataset.hhText;

    if (!text || text.length < 50) {
      showToast('Please select more text to verify', 'error');
      return;
    }

    btn.classList.add('verifying');
    btn.textContent = 'Verifying...';

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'VERIFY_TEXT',
        text: text,
        mode: 'standard',
      });

      if (response.success) {
        showToast('Verification complete! Check the side panel.', 'success');
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
      } else {
        showToast(response.error || 'Verification failed', 'error');
      }
    } catch (error) {
      console.error('[HH] Verification error:', error);
      showToast('Verification failed: ' + error.message, 'error');
    } finally {
      btn.classList.remove('verifying');
      btn.textContent = 'Verify with Hallucination Hunter';
    }
  }

  function showToast(message, type = 'info') {
    document.querySelectorAll('.hh-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `hh-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  window.addEventListener('beforeunload', () => {
    if (observer) observer.disconnect();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();