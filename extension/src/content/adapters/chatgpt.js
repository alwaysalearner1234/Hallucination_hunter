// content/adapters/chatgpt.js - ChatGPT Content Script Adapter
(function() {
  'use strict';

  const PLATFORM = 'chatgpt';
  let observer = null;
  let processedElements = new WeakSet();

  // Selectors for ChatGPT
  const SELECTORS = {
    // Assistant message containers
    message: '[data-message-author-role="assistant"]',
    // Text content within message
    messageContent: '.markdown, .prose, [data-message-id]',
    // Code blocks (to avoid)
    codeBlock: 'pre, code',
    // Verification button container
    buttonContainer: '.hh-verify-container',
  };

  function init() {
    console.log('[HH] ChatGPT adapter initialized');
    startObserving();
    // Process existing messages
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
    const messages = root.querySelectorAll ?
      root.querySelectorAll(SELECTORS.message) :
      [];

    // Also check if root itself is a message
    if (root.matches && root.matches(SELECTORS.message)) {
      processMessage(root);
    }

    messages.forEach(processMessage);
  }

  function processExistingMessages() {
    document.querySelectorAll(SELECTORS.message).forEach(processMessage);
  }

  function processMessage(messageEl) {
    if (processedElements.has(messageEl)) return;
    processedElements.add(messageEl);

    const contentEl = messageEl.querySelector(SELECTORS.messageContent);
    if (!contentEl) return;

    const text = extractText(contentEl);
    if (!text || text.trim().length < 50) return;

    // Check if already has verify button
    if (messageEl.querySelector('.hh-verify-btn')) return;

    injectVerifyButton(messageEl, contentEl, text);
  }

  function extractText(element) {
    // Clone to avoid modifying original
    const clone = element.cloneNode(true);

    // Remove code blocks
    clone.querySelectorAll(SELECTORS.codeBlock).forEach(el => el.remove());

    // Get text content
    return clone.textContent?.trim() || '';
  }

  function injectVerifyButton(messageEl, contentEl, text) {
    // Create container for the button
    const container = document.createElement('div');
    container.className = 'hh-verify-container';
    container.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);';

    const btn = document.createElement('button');
    btn.className = 'hh-verify-btn';
    btn.textContent = 'Verify with Hallucination Hunter';
    btn.dataset.hhText = text;
    btn.addEventListener('click', handleVerifyClick);

    container.appendChild(btn);

    // Insert after the content
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
        // Open side panel
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
    // Remove existing toasts
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

  // Listen for selection changes to show context menu alternative
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length >= 20) {
      // Selection is long enough, context menu will be available
    }
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    if (observer) {
      observer.disconnect();
    }
  });

  // Start when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();