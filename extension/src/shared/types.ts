// shared/types.ts - Shared TypeScript types for the extension
export type VerificationMode = 'quick' | 'standard' | 'deep' | 'strict';
export type VerificationStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type Verdict = 'VERIFIED' | 'FALSE' | 'UNVERIFIABLE';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Importance = 'low' | 'medium' | 'high';
export type SourceInputType = 'paste' | 'share' | 'screenshot' | 'document' | 'demo' | 'extension';

export interface Source {
  id: string;
  url: string;
  title?: string;
  publisher?: string;
  published_at?: string;
  source_type?: string;
  quality_score?: number;
  quality_reasons?: string[];
}

export interface Evidence {
  id: string;
  snippet: string;
  relevance_score?: number;
  supports_claim?: boolean;
  source: Source;
}

export interface Claim {
  id: string;
  claim_index: number;
  text: string;
  claim_type?: string;
  importance?: Importance;
  verdict?: Verdict;
  confidence?: number;
  severity?: Severity;
  reasoning?: string;
  correction?: string;
  correction_evidence?: string;
  evidence?: Evidence[];
}

export interface VerificationResult {
  verification_id: string;
  status: VerificationStatus;
  trust_score?: number;
  total_claims: number;
  verified: number;
  false: number;
  unverifiable: number;
  claims: Claim[];
  verified_answer?: string;
  processing_time_ms?: number;
  created_at: string;
}

export interface VerifyRequest {
  text: string;
  mode?: VerificationMode;
  source_type?: SourceInputType;
  guest_id?: string;
}

export interface ProgressEvent {
  event: string;
  data: Record<string, unknown>;
  session_id: string;
}

export interface ExtensionSettings {
  apiUrl: string;
  apiKey: string;
  defaultMode: VerificationMode;
  autoOpenSidePanel: boolean;
  showNotifications: boolean;
}

export interface AIPlatformAdapter {
  name: string;
  matches: string[];
  extractText: (element: HTMLElement) => string | null;
  findResponseElements: () => HTMLElement[];
  injectVerifyButton: (element: HTMLElement, onClick: () => void) => void;
}