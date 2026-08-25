// components/TrustScoreGauge.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, TRUST_SCORE_CONFIG, Spacing } from '../constants/theme';

interface TrustScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

export const TrustScoreGauge: React.FC<TrustScoreGaugeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  animate = true,
}) => {
  const config = TRUST_SCORE_CONFIG(score);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(animatedValue, {
        toValue: score,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(score);
    }
  }, [score, animate]);

  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  const containerSize = isLarge ? 160 : isSmall ? 64 : 100;
  const fontSize = isLarge ? Typography.fontSize['4xl'] : isSmall ? Typography.fontSize.lg : Typography.fontSize['2xl'];
  const strokeWidth = isLarge ? 10 : isSmall ? 5 : 7;
  const radius = (containerSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      {/* Circular progress ring */}
      <View style={StyleSheet.absoluteFill}>
        <View style={[styles.ring, {
          borderRadius: containerSize / 2,
          borderWidth: strokeWidth,
          borderColor: Colors.surfaceBorder,
          width: containerSize,
          height: containerSize,
        }]} />
        <View style={[styles.ring, StyleSheet.absoluteFill, {
          borderRadius: containerSize / 2,
          borderWidth: strokeWidth,
          borderColor: config.color,
          width: containerSize,
          height: containerSize,
          opacity: 0.3,
        }]} />
      </View>

      {/* Score text */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { fontSize, color: config.color }]}>
          {score}
        </Text>
        {!isSmall && (
          <Text style={styles.outOf}>/100</Text>
        )}
      </View>

      {showLabel && !isSmall && (
        <Text style={[styles.label, { color: config.color }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  score: {
    fontWeight: '800',
    letterSpacing: -1,
  },
  outOf: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.sm,
    marginBottom: 6,
    fontWeight: '600',
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
});
