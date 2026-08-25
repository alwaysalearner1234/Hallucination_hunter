// types/index.ts — All shared TypeScript types for Hallucination Hunter

export type VerificationMode = 'quick' | 'standard' | 'deep' | 'strict';
export type VerificationStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type Verdict = 'VERIFIED' | 'FALSE' | 'UNVERIFIABLE';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Importance = 'low' | 'medium' | 'high';
export type ClaimType =
  | 'historical' | 'scientific' | 'geographical' | 'political'
  | 'economic' | 'financial' | 'medical' | 'technical' | 'statistical'
  | 'biographical' | 'legal' | 'current_events' | 'company_info'
  | 'product_info' | 'general';

export type SourceType = 'government' | 'academic' | 'news' | 'encyclopedia' | 'company' | 'research' | 'medical' | 'unknown';
export type SourceInputType = 'paste' | 'share' | 'screenshot' | 'document' | 'demo';

export interface Source {
  id: string;
  url: string;
  title?: string;
  publisher?: string;
  published_at?: string;
  source_type?: SourceType;
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
  claim_type?: ClaimType;
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

export interface HistoryItem {
  verification_id: string;
  status: VerificationStatus;
  trust_score?: number;
  total_claims: number;
  verified: number;
  false: number;
  unverifiable: number;
  created_at: string;
  source_type?: SourceInputType;
  input_preview?: string;
}

export interface ProgressEvent {
  event: string;
  data: Record<string, unknown>;
  session_id: string;
}

export type AnalysisStage =
  | 'idle'
  | 'extracting_claims'
  | 'searching_evidence'
  | 'verifying_claim'
  | 'calculating_trust'
  | 'complete'
  | 'error';

export interface AnalysisProgress {
  stage: AnalysisStage;
  label: string;
  claimsFound?: number;
  claimsVerified?: number;
  totalClaims?: number;
  currentClaimText?: string;
  trustScore?: number;
}
