// services/api.ts — Backend API client
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VerifyRequest, VerificationResult, HistoryItem, ProgressEvent } from '../types';

// Change this to your backend URL
const BASE_URL = __DEV__
  ? 'http://10.0.2.2:8000'   // Android emulator → localhost
  : 'https://your-production-api.com';

const API_BASE = `${BASE_URL}/api/v1`;

// ── Guest ID ──────────────────────────────────────────────────
async function getGuestId(): Promise<string> {
  let guestId = await AsyncStorage.getItem('guest_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem('guest_id', guestId);
  }
  return guestId;
}

// ── HTTP helpers ──────────────────────────────────────────────
async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new APIError(error.detail || 'Request failed', response.status);
  }

  return response.json();
}

// ── API Functions ──────────────────────────────────────────────

export const api = {
  /** Full synchronous verification */
  async verify(request: VerifyRequest): Promise<VerificationResult> {
    const guestId = await getGuestId();
    return apiRequest<VerificationResult>('/verify', {
      method: 'POST',
      body: JSON.stringify({ ...request, guest_id: guestId }),
    });
  },

  /** Get history list */
  async getHistory(page = 1, pageSize = 20): Promise<{ items: HistoryItem[]; total: number }> {
    return apiRequest(`/history?page=${page}&page_size=${pageSize}`);
  },

  /** Get single history item */
  async getHistoryItem(id: string): Promise<VerificationResult> {
    return apiRequest(`/history/${id}`);
  },

  /** Delete history item */
  async deleteHistoryItem(id: string): Promise<void> {
    await apiRequest(`/history/${id}`, { method: 'DELETE' });
  },

  /** Upload image for OCR */
  async ocrImage(imageUri: string): Promise<{ text: string; ocr_confidence: number; low_confidence: boolean; warning?: string }> {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'screenshot.jpg',
    } as unknown as Blob);

    const response = await fetch(`${API_BASE}/ocr`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'OCR failed' }));
      throw new APIError(error.detail, response.status);
    }
    return response.json();
  },

  /** Upload document */
  async uploadDocument(fileUri: string, fileName: string, mimeType: string): Promise<{ text: string; file_type: string; truncated: boolean }> {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    } as unknown as Blob);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new APIError(error.detail, response.status);
    }
    return response.json();
  },

  /** Health check */
  async health(): Promise<Record<string, string>> {
    return apiRequest('/health');
  },

  getStreamUrl(): string {
    return `${API_BASE}/verify/stream`;
  },

  getBaseUrl(): string {
    return BASE_URL;
  },
};

// ── SSE Streaming ─────────────────────────────────────────────
export async function verifyWithStream(
  request: VerifyRequest,
  onProgress: (event: ProgressEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const guestId = await getGuestId();
  const url = api.getStreamUrl();

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, guest_id: guestId }),
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

// ── Error class ───────────────────────────────────────────────
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
