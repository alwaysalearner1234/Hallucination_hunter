// components/ProgressStages.tsx — Live analysis progress UI
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AnalysisProgress, AnalysisStage } from '../types';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const STAGES: { key: AnalysisStage; label: string; icon: string }[] = [
  { key: 'extracting_claims', label: 'Reading response', icon: '📖' },
  { key: 'searching_evidence', label: 'Searching evidence', icon: '🔍' },
  { key: 'verifying_claim', label: 'Verifying claims', icon: '⚖️' },
  { key: 'calculating_trust', label: 'Calculating trust', icon: '📊' },
  { key: 'complete', label: 'Generating report', icon: '✅' },
];

const STAGE_ORDER: Record<string, number> = {
  extracting_claims: 0,
  searching_evidence: 1,
  verifying_claim: 2,
  calculating_trust: 3,
  complete: 4,
};

interface ProgressStagesProps {
  progress: AnalysisProgress;
}

export const ProgressStages: React.FC<ProgressStagesProps> = ({ progress }) => {
  const currentIndex = STAGE_ORDER[progress.stage] ?? -1;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [progress.stage]);

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.max(5, ((currentIndex + 1) / STAGES.length) * 100)}%` as `${number}%`,
            },
          ]}
        />
      </View>

      {/* Stage rows */}
      <View style={styles.stages}>
        {STAGES.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <View key={stage.key} style={styles.stageRow}>
              <Animated.View
                style={[
                  styles.stageIcon,
                  isComplete && styles.iconComplete,
                  isActive && styles.iconActive,
                  isPending && styles.iconPending,
                  isActive && { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.iconText}>
                  {isComplete ? '✓' : stage.icon}
                </Text>
              </Animated.View>

              <View style={styles.stageInfo}>
                <Text style={[
                  styles.stageLabel,
                  isComplete && styles.labelComplete,
                  isActive && styles.labelActive,
                  isPending && styles.labelPending,
                ]}>
                  {stage.label}
                </Text>
                {isActive && progress.label && (
                  <Text style={styles.stageSubLabel} numberOfLines={1}>
                    {progress.label}
                  </Text>
                )}
              </View>

              {isActive && (
                <View style={styles.activeIndicator} />
              )}
            </View>
          );
        })}
      </View>

      {/* Stats */}
      {(progress.claimsFound || progress.claimsVerified) && (
        <View style={styles.statsRow}>
          {progress.claimsFound !== undefined && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{progress.claimsFound}</Text>
              <Text style={styles.statLabel}>Claims Found</Text>
            </View>
          )}
          {progress.claimsVerified !== undefined && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{progress.claimsVerified}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stages: {
    gap: Spacing.base,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stageIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  iconComplete: {
    backgroundColor: Colors.verifiedBg,
    borderWidth: 1,
    borderColor: Colors.verifiedBorder,
  },
  iconActive: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  iconPending: {
    opacity: 0.4,
  },
  iconText: {
    fontSize: 16,
  },
  stageInfo: {
    flex: 1,
  },
  stageLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: '500',
  },
  labelComplete: {
    color: Colors.verified,
  },
  labelActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  labelPending: {
    color: Colors.textMuted,
  },
  stageSubLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginTop: 2,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.xl,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: Colors.primary,
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
});
