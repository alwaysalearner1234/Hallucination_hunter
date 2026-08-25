// app/verify/analysis.tsx — Live Analysis Progress Screen
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVerification } from '../../hooks/useVerification';
import { ProgressStages } from '../../components/ProgressStages';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { VerificationMode } from '../../types';

export default function AnalysisScreen() {
  const { text, mode, source_type } = useLocalSearchParams<{
    text: string;
    mode: string;
    source_type: string;
  }>();

  const { result, progress, isLoading, error, verify, cancel } = useVerification();
  const hasStarted = useRef(false);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (!text) {
      router.back();
      return;
    }

    verify({
      text,
      mode: (mode as VerificationMode) || 'standard',
      source_type: (source_type as 'paste' | 'demo') || 'paste',
    });
  }, []);

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ])
    );
    if (isLoading) pulse.start();
    else pulse.stop();
    return () => pulse.stop();
  }, [isLoading]);

  useEffect(() => {
    if (result && progress.stage === 'complete') {
      router.replace({
        pathname: '/verify/results',
        params: { data: JSON.stringify(result) },
      });
    }
  }, [result, progress.stage]);

  const handleCancel = () => {
    Alert.alert('Cancel Verification', 'Stop the current verification?', [
      { text: 'Continue', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: () => {
          cancel();
          router.back();
        },
      },
    ]);
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Animated.View style={[styles.iconRing, { opacity: pulseAnim }]}>
            <View style={styles.iconInner}>
              <Text style={{ fontSize: 36 }}>🎯</Text>
            </View>
          </Animated.View>
          <Text style={styles.title}>Verifying Claims</Text>
          <Text style={styles.subtitle}>
            Searching real sources for evidence...
          </Text>
        </View>

        {/* Progress stages */}
        <View style={styles.stagesContainer}>
          <ProgressStages progress={progress} />
        </View>

        {/* Current claim being verified */}
        {progress.currentClaimText && (
          <View style={styles.currentClaim}>
            <Text style={styles.currentClaimLabel}>Currently verifying</Text>
            <Text style={styles.currentClaimText} numberOfLines={3}>
              "{progress.currentClaimText}"
            </Text>
          </View>
        )}

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Evidence is retrieved from real web sources.{'\n'}
          No results are fabricated.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48, flexGrow: 1 },
  header: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: `${Colors.primary}50`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize['2xl'],
    fontFamily: 'Inter_700Bold',
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  stagesContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
  },
  currentClaim: {
    marginHorizontal: Spacing.xl,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: `${Colors.primary}25`,
    marginBottom: Spacing.xl,
  },
  currentClaimLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  currentClaimText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cancelBtn: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_500Medium' },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'] },
  errorIcon: { fontSize: 64, marginBottom: Spacing.xl },
  errorTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontFamily: 'Inter_700Bold', marginBottom: Spacing.md },
  errorMessage: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: Spacing['2xl'] },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, borderRadius: BorderRadius.lg },
  retryBtnText: { color: Colors.white, fontSize: Typography.fontSize.base, fontFamily: 'Inter_700Bold' },
});
