// app/index.tsx — Splash screen with animated logo
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { storage } from '../services/storage';
import { Colors, Typography, Spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Logo animation sequence
    Animated.sequence([
      // Ring expands
      Animated.parallel([
        Animated.spring(ringScale, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Logo appears
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Title appears
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Subtitle appears
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after animation
    const timer = setTimeout(async () => {
      const done = await storage.isOnboardingComplete();
      if (done) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Background glow */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      {/* Rings */}
      <Animated.View style={[styles.ringOuter, { transform: [{ scale: ringScale }], opacity: glowOpacity }]} />
      <Animated.View style={[styles.ringInner, { transform: [{ scale: ringScale }], opacity: glowOpacity }]} />

      {/* Logo Icon */}
      <Animated.View style={[
        styles.logoContainer,
        { transform: [{ scale: logoScale }], opacity: logoOpacity }
      ]}>
        <Text style={styles.logoIcon}>🎯</Text>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
        <Text style={styles.title}>Hallucination</Text>
        <Text style={styles.titleAccent}>Hunter</Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Verify AI. Trust Evidence.
      </Animated.Text>

      {/* Version */}
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.06,
  },
  ringOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  ringInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}50`,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}60`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoIcon: {
    fontSize: 44,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  titleAccent: {
    fontSize: Typography.fontSize['3xl'],
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.3,
  },
  version: {
    position: 'absolute',
    bottom: 40,
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontFamily: 'Inter_400Regular',
  },
});
