// constants/theme.ts — Design system for Hallucination Hunter
// Dark-mode AI security aesthetic

export const Colors = {
  // Brand
  primary: '#6C63FF',        // Electric violet
  primaryLight: '#8B85FF',
  primaryDark: '#5046E4',
  accent: '#00D4FF',         // Cyan accent
  accentGreen: '#00E5A0',    // Verified green
  accentRed: '#FF4757',      // False red
  accentAmber: '#FFA502',    // Unverifiable amber

  // Backgrounds
  background: '#0A0A0F',     // Deep space black
  surface: '#12121A',        // Card surface
  surfaceLight: '#1A1A2E',   // Elevated surface
  surfaceBorder: '#2A2A3E',  // Border / divider

  // Text
  textPrimary: '#F0F0FF',
  textSecondary: '#9090B0',
  textMuted: '#5A5A7A',
  textInverse: '#0A0A0F',

  // Verdict colors
  verified: '#00E5A0',
  verifiedBg: 'rgba(0, 229, 160, 0.12)',
  verifiedBorder: 'rgba(0, 229, 160, 0.3)',

  false: '#FF4757',
  falseBg: 'rgba(255, 71, 87, 0.12)',
  falseBorder: 'rgba(255, 71, 87, 0.3)',

  unverifiable: '#FFA502',
  unverifiableBg: 'rgba(255, 165, 2, 0.12)',
  unverifiableBorder: 'rgba(255, 165, 2, 0.3)',

  // Severity
  severityLow: '#00E5A0',
  severityMedium: '#FFA502',
  severityHigh: '#FF6B35',
  severityCritical: '#FF4757',

  // Trust score gradient
  trustHigh: '#00E5A0',       // 80-100
  trustMedium: '#FFA502',     // 50-79
  trustLow: '#FF4757',        // 0-49

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    mono: 'SpaceMono_400Regular',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 36,
    '4xl': 48,
    '5xl': 64,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const VERDICT_CONFIG = {
  VERIFIED: {
    label: 'VERIFIED',
    color: Colors.verified,
    bg: Colors.verifiedBg,
    border: Colors.verifiedBorder,
    icon: '✓',
    emoji: '🟢',
  },
  FALSE: {
    label: 'FALSE',
    color: Colors.false,
    bg: Colors.falseBg,
    border: Colors.falseBorder,
    icon: '✗',
    emoji: '🔴',
  },
  UNVERIFIABLE: {
    label: 'UNVERIFIABLE',
    color: Colors.unverifiable,
    bg: Colors.unverifiableBg,
    border: Colors.unverifiableBorder,
    icon: '?',
    emoji: '🟡',
  },
};

export const TRUST_SCORE_CONFIG = (score: number) => {
  if (score >= 80) return { color: Colors.trustHigh, label: 'High Trust' };
  if (score >= 50) return { color: Colors.trustMedium, label: 'Medium Trust' };
  return { color: Colors.trustLow, label: 'Low Trust' };
};

export const SEVERITY_CONFIG = {
  LOW: { color: Colors.severityLow, bg: 'rgba(0, 229, 160, 0.1)' },
  MEDIUM: { color: Colors.severityMedium, bg: 'rgba(255, 165, 2, 0.1)' },
  HIGH: { color: Colors.severityHigh, bg: 'rgba(255, 107, 53, 0.1)' },
  CRITICAL: { color: Colors.severityCritical, bg: 'rgba(255, 71, 87, 0.1)' },
};
