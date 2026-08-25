// services/storage.ts — Local persistence for history and settings
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VerificationResult } from '../types';

const KEYS = {
  HISTORY: 'hh_local_history',
  SETTINGS: 'hh_settings',
  GUEST_ID: 'guest_id',
  ONBOARDING_DONE: 'hh_onboarding_done',
};

export interface LocalSettings {
  defaultMode: 'quick' | 'standard' | 'deep' | 'strict';
  saveHistory: boolean;
  privacyMode: boolean;
}

const DEFAULT_SETTINGS: LocalSettings = {
  defaultMode: 'standard',
  saveHistory: true,
  privacyMode: false,
};

export const storage = {
  // ── History ───────────────────────────────────────────────

  async saveVerification(result: VerificationResult): Promise<void> {
    try {
      const settings = await storage.getSettings();
      if (!settings.saveHistory) return;

      const existing = await storage.getHistory();
      const updated = [result, ...existing].slice(0, 100); // Keep last 100
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('storage.saveVerification:', e);
    }
  },

  async getHistory(): Promise<VerificationResult[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async deleteVerification(id: string): Promise<void> {
    const history = await storage.getHistory();
    const updated = history.filter((h) => h.verification_id !== id);
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
  },

  async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.HISTORY);
  },

  // ── Settings ──────────────────────────────────────────────

  async getSettings(): Promise<LocalSettings> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: Partial<LocalSettings>): Promise<void> {
    const current = await storage.getSettings();
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
  },

  // ── Onboarding ────────────────────────────────────────────

  async isOnboardingComplete(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
    return val === 'true';
  },

  async setOnboardingComplete(): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
  },

  // ── Clear all ─────────────────────────────────────────────

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.HISTORY, KEYS.SETTINGS, KEYS.ONBOARDING_DONE]);
  },
};
