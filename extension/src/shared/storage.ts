// shared/storage.ts - Storage utilities for the extension
import { VerificationResult } from './types';

const STORAGE_KEYS = {
  HISTORY: 'hh_history',
  MAX_HISTORY_ITEMS: 100,
} as const;

export const storage = {
  async getHistory(): Promise<VerificationResult[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return result[STORAGE_KEYS.HISTORY] || [];
  },

  async saveVerification(verification: VerificationResult): Promise<void> {
    const history = await this.getHistory();
    // Remove existing if same ID (update)
    const filtered = history.filter(v => v.verification_id !== verification.verification_id);
    // Add new at beginning
    const updated = [verification, ...filtered].slice(0, STORAGE_KEYS.MAX_HISTORY_ITEMS);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
  },

  async deleteVerification(id: string): Promise<void> {
    const history = await this.getHistory();
    const filtered = history.filter(v => v.verification_id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: filtered });
  },

  async clearHistory(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
  },

  async getCachedVerification(claimText: string): Promise<VerificationResult | null> {
    const result = await chrome.storage.local.get('hh_verification_cache');
    const cache = result.hh_verification_cache || {};
    const key = this.hashClaim(claimText);
    return cache[key] || null;
  },

  async setCachedVerification(claimText: string, verification: VerificationResult): Promise<void> {
    const result = await chrome.storage.local.get('hh_verification_cache');
    const cache = result.hh_verification_cache || {};
    const key = this.hashClaim(claimText);
    cache[key] = verification;
    // Limit cache size
    if (Object.keys(cache).length > 500) {
      const keys = Object.keys(cache);
      delete cache[keys[0]];
    }
    await chrome.storage.local.set({ hh_verification_cache: cache });
  },

  hashClaim(text: string): string {
    // Simple hash for cache key - lowercase, remove punctuation, collapse whitespace
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
  },
};

// Listen for storage changes to sync across contexts
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.hh_settings) {
    // Settings changed, could notify other parts
    console.log('[HH] Settings updated');
  }
});