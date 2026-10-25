// shared/constants.ts - Shared constants for the extension
export const VERDICT_CONFIG = {
  VERIFIED: {
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#10B981',
    label: 'Verified',
    icon: '✓',
  },
  FALSE: {
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#EF4444',
    label: 'False',
    icon: '✗',
  },
  UNVERIFIABLE: {
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#F59E0B',
    label: 'Unverifiable',
    icon: '?',
  },
};

export const SEVERITY_CONFIG = {
  CRITICAL: { color: '#DC2626', bg: '#FEF2F2' },
  HIGH: { color: '#EF4444', bg: '#FEF2F2' },
  MEDIUM: { color: '#F59E0B', bg: '#FFFBEB' },
  LOW: { color: '#6B7280', bg: '#F3F4F6' },
};

export const TRUST_SCORE_CONFIG = (score: number) => {
  if (score >= 80) return { label: 'High Trust', color: '#10B981' };
  if (score >= 60) return { label: 'Moderate Trust', color: '#F59E0B' };
  if (score >= 40) return { label: 'Low Trust', color: '#F97316' };
  return { label: 'Unreliable', color: '#EF4444' };
};

export const CLAIM_TYPES = [
  'historical',
  'scientific',
  'geographical',
  'political',
  'economic',
  'financial',
  'medical',
  'technical',
  'statistical',
  'biographical',
  'legal',
  'current_events',
  'company_info',
  'product_info',
  'general',
];

export const VERIFICATION_MODES = [
  { key: 'quick', label: 'Quick', desc: 'Fast verification (~15s)' },
  { key: 'standard', label: 'Standard', desc: 'Balanced (~30s)' },
  { key: 'deep', label: 'Deep', desc: 'Thorough (~60s)' },
  { key: 'strict', label: 'Strict', desc: 'Rigorous (~90s)' },
] as const;

export const STAGES = [
  { key: 'extracting_claims', label: 'Extracting claims', icon: '📖' },
  { key: 'searching_evidence', label: 'Searching evidence', icon: '🔍' },
  { key: 'verifying_claim', label: 'Verifying claims', icon: '⚖️' },
  { key: 'calculating_trust', label: 'Calculating trust', icon: '📊' },
  { key: 'complete', label: 'Complete', icon: '✅' },
];