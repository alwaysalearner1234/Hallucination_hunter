// app/onboarding.tsx — 3-step onboarding carousel
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { storage } from '../services/storage';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    icon: '🤖',
    title: 'AI Can Be Wrong',
    description:
      'Large language models can confidently state information that is false, outdated, or misleading — even when they sound certain.',
    accent: Colors.primary,
  },
  {
    icon: '🔍',
    title: 'We Verify Each Claim',
    description:
      'Hallucination Hunter splits AI responses into individual claims and searches real sources to check each one independently.',
    accent: Colors.accentGreen,
  },
  {
    icon: '📊',
    title: 'See Evidence & Trust Score',
    description:
      'Every claim gets a verdict — VERIFIED, FALSE, or UNVERIFIABLE — backed by real evidence with source quality scores.',
    accent: Colors.accent,
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const dotScale = useRef(STEPS.map(() => new Animated.Value(1))).current;

  const animateDot = (index: number) => {
    dotScale.forEach((scale, i) => {
      Animated.spring(scale, {
        toValue: i === index ? 1.4 : 1,
        useNativeDriver: true,
        speed: 20,
      }).start();
    });
  };

  const goNext = async () => {
    if (currentIndex < STEPS.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
      animateDot(next);
    } else {
      await storage.setOnboardingComplete();
      router.replace('/(tabs)');
    }
  };

  const skip = async () => {
    await storage.setOnboardingComplete();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={skip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Icon */}
            <View style={[styles.iconContainer, { borderColor: `${item.accent}40`, backgroundColor: `${item.accent}12` }]}>
              <Text style={styles.stepIcon}>{item.icon}</Text>
            </View>
            {/* Step number */}
            <Text style={[styles.stepNum, { color: item.accent }]}>
              {STEPS.indexOf(item) + 1} of {STEPS.length}
            </Text>
            <Text style={styles.stepTitle}>{item.title}</Text>
            <Text style={styles.stepDesc}>{item.description}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
              { transform: [{ scale: dotScale[i] }] },
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
          <Text style={styles.primaryBtnText}>
            {currentIndex === STEPS.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
        </TouchableOpacity>
        {currentIndex === 0 && (
          <TouchableOpacity style={styles.guestBtn} onPress={skip}>
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 48,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: Spacing.xl,
    zIndex: 10,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_500Medium',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    paddingTop: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  stepIcon: {
    fontSize: 56,
  },
  stepNum: {
    fontSize: Typography.fontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  stepTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize['2xl'],
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: Spacing.base,
    letterSpacing: -0.3,
  },
  stepDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing['2xl'],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceBorder,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
    borderRadius: 3,
  },
  buttons: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSize.md,
    fontFamily: 'Inter_700Bold',
  },
  guestBtn: {
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  guestBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_500Medium',
  },
});
