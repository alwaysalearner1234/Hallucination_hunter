// shared/api.ts - Backend API client for the extension
import { VerifyRequest, VerificationResult, ProgressEvent, ExtensionSettings } from './types';

const STORAGE_KEYS = {
  SETTINGS: 'hh_settings',
  GUEST_ID: 'hh_guest_id',
  VERIFICATION_CACHE: 'hh_verification_cache',
} as const;

const DEFAULT_API_URL = 'https://api.truthlayer.example.com/api/v1';

async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] || {
    apiUrl: DEFAULT_API_URL,
    apiKey: '',
    defaultMode: 'standard',
    autoOpenSidePanel: true,
    showNotifications: true,
  };
}

async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: { ...current, ...settings } });
}

async function getGuestId(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.GUEST_ID);
  if (result[STORAGE_KEYS.GUEST_ID]) {
    return result[STORAGE_KEYS.GUEST_ID];
  }
  const guestId = `ext_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await chrome.storage.local.set({ [STORAGE_KEYS.GUEST_ID]: guestId });
  return guestId;
}

function getApiUrl(): string {
  return new URL('/', DEFAULT_API_URL).origin + '/api/v1';
}

async function makeRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const settings = await getSettings();
  const baseUrl = settings.apiUrl || DEFAULT_API_URL;
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (settings.apiKey) {
    headers['X-API-Key'] = settings.apiKey;
  }

  const guestId = await getGuestId();
  headers['X-Guest-ID'] = guestId;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new APIError(error.detail || `HTTP ${response.status}`, response.status);
  }

  return response.json();
}

export const api = {
  async verify(request: VerifyRequest): Promise<VerificationResult> {
    const settings = await getSettings();
    return makeRequest<VerificationResult>('/verify', {
      method: 'POST',
      body: JSON.stringify({ ...request, guest_id: await getGuestId(), mode: request.mode || settings.defaultMode }),
    });
  },

  async getHistory(page = 1, pageSize = 20): Promise<{ items: VerificationResult[]; total: number }> {
    return makeRequest(`/history?page=${page}&page_size=${pageSize}`);
  },

  async getHistoryItem(id: string): Promise<VerificationResult> {
    return makeRequest(`/history/${id}`);
  },

  async deleteHistoryItem(id: string): Promise<void> {
    await makeRequest(`/history/${id}`, { method: 'DELETE' });
  },

  async health(): Promise<Record<string, string>> {
    return makeRequest('/health');
  },

  getStreamUrl(): string {
    return `${DEFAULT_API_URL}/verify/stream`;
  },

  getBaseUrl(): string {
    return DEFAULT_API_URL.replace('/api/v1', '');
  },

  async getSettings(): Promise<ExtensionSettings> {
    return getSettings();
  },

  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    return saveSettings(settings);
  },
};

// SSE Streaming for real-time progress
export async function verifyWithStream(
  request: VerifyRequest,
  onProgress: (event: ProgressEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const settings = await getSettings();
  const baseUrl = settings.apiUrl || DEFAULT_API_URL;
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
    throw new APIError(`Stream failed: ${response.status}`, response.status);
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
          const data = JSON.parse(line.slice(6)) as ProgressEvent;
          onProgress(data);
        } catch {
          // Skip malformed SSE events
        }
      }
    }
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const isNetworkError = (error: unknown): boolean =>
  error instanceof TypeError && error.message.includes('fetch');

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof APIError) return error.message;
  if (isNetworkError(error)) return 'No internet connection. Verification requires an internet connection to retrieve evidence.';
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
};