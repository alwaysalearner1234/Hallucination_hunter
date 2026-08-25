// components/ClaimCard.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { Claim } from '../types';
import { VerdictBadge } from './VerdictBadge';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  SEVERITY_CONFIG,
} from '../constants/theme';

interface ClaimCardProps {
  claim: Claim;
  onPress: (claim: Claim) => void;
  onViewEvidence?: (claim: Claim) => void;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, onPress, onViewEvidence }) => {
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 20 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  const severityConfig = claim.severity ? SEVERITY_CONFIG[claim.severity] : null;
  const evidencePreview = claim.evidence?.[0]?.snippet;
  const sourceCount = claim.evidence?.length ?? 0;

  const confidenceColor =
    (claim.confidence ?? 0) >= 80 ? Colors.verified :
    (claim.confidence ?? 0) >= 50 ? Colors.unverifiable :
    Colors.false;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(claim)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Header */}
        <View style={styles.header}>
          {claim.verdict && <VerdictBadge verdict={claim.verdict} size="sm" />}
          {claim.severity && severityConfig && claim.verdict !== 'VERIFIED' && (
            <View style={[styles.severityBadge, { backgroundColor: severityConfig.bg }]}>
              <Text style={[styles.severityText, { color: severityConfig.color }]}>
                {claim.severity}
              </Text>
            </View>
          )}
          {claim.confidence !== undefined && (
            <Text style={[styles.confidence, { color: confidenceColor }]}>
              {claim.confidence}%
            </Text>
          )}
        </View>

        {/* Claim text */}
        <Text style={styles.claimText} numberOfLines={3}>
          {claim.text}
        </Text>

        {/* Evidence preview */}
        {evidencePreview && (
          <View style={styles.evidencePreview}>
            <Text style={styles.evidenceLabel}>Evidence</Text>
            <Text style={styles.evidenceText} numberOfLines={2}>
              "{evidencePreview}"
            </Text>
          </View>
        )}

        {/* Correction */}
        {claim.correction && (
          <View style={styles.correctionBox}>
            <Text style={styles.correctionLabel}>✏ Correction</Text>
            <Text style={styles.correctionText} numberOfLines={2}>
              {claim.correction}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.claimType}>
              {claim.claim_type?.replace(/_/g, ' ').toUpperCase() ?? 'GENERAL'}
            </Text>
            {sourceCount > 0 && (
              <Text style={styles.sourceCount}>
                {sourceCount} source{sourceCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => onPress(claim)}
          >
            <Text style={styles.detailBtnText}>Details →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidence: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  claimText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * 1.5,
    marginBottom: Spacing.md,
  },
  evidencePreview: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  evidenceLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  evidenceText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  correctionBox: {
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  correctionLabel: {
    color: Colors.primary,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    marginBottom: 4,
  },
  correctionText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  claimType: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sourceCount: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
  },
  detailBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  detailBtnText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
});
