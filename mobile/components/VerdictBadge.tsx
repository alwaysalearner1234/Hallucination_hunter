// components/VerdictBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Verdict } from '../types';
import { VERDICT_CONFIG, Typography, BorderRadius, Spacing } from '../constants/theme';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'md' }) => {
  const config = VERDICT_CONFIG[verdict];
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.bg, borderColor: config.border },
      isSmall && styles.badgeSm,
      isLarge && styles.badgeLg,
    ]}>
      <Text style={[styles.icon, { color: config.color }, isSmall && styles.iconSm]}>
        {config.icon}
      </Text>
      <Text style={[
        styles.label,
        { color: config.color },
        isSmall && styles.labelSm,
        isLarge && styles.labelLg,
      ]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeLg: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  icon: {
    fontSize: 12,
    fontWeight: '800',
  },
  iconSm: {
    fontSize: 10,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  labelSm: {
    fontSize: 10,
  },
  labelLg: {
    fontSize: Typography.fontSize.sm,
  },
});
