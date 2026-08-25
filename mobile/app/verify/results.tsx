// app/verify/results.tsx — Verification Results Screen
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerificationResult, Claim } from '../../types';
import { ClaimCard } from '../../components/ClaimCard';
import { TrustScoreGauge } from '../../components/TrustScoreGauge';
import { VerdictBadge } from '../../components/VerdictBadge';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows, TRUST_SCORE_CONFIG,
} from '../../constants/theme';

type FilterType = 'all' | 'VERIFIED' | 'FALSE' | 'UNVERIFIABLE';

export default function ResultsScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const result: VerificationResult = data ? JSON.parse(data) : null;

  const [filter, setFilter] = useState<FilterType>('all');
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result?.trust_score !== undefined) {
      Animated.spring(scoreAnim, {
        toValue: result.trust_score,
        tension: 30,
        friction: 10,
        useNativeDriver: false,
      }).start();
    }
  }, [result]);

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No results available.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: Colors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const trustConfig = result.trust_score !== undefined ? TRUST_SCORE_CONFIG(result.trust_score) : null;

  const filteredClaims = filter === 'all'
    ? result.claims
    : result.claims.filter((c) => c.verdict === filter);

  const handleShareResult = async () => {
    const text = `Hallucination Hunter Results\n\nTrust Score: ${result.trust_score}/100\n✅ Verified: ${result.verified} | ❌ False: ${result.false} | ❓ Unverifiable: ${result.unverifiable}\n\nVerified with Hallucination Hunter`;
    await Share.share({ message: text });
  };

  const handleClaimPress = (claim: Claim) => {
    router.push({
      pathname: '/verify/claim-detail',
      params: { claim: JSON.stringify(claim) },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Trust Score Header */}
        <View style={styles.scoreSection}>
          <TrustScoreGauge score={result.trust_score ?? 0} size="lg" animate />
          {trustConfig && (
            <Text style={[styles.trustLabel, { color: trustConfig.color }]}>
              {trustConfig.label}
            </Text>
          )}
          <Text style={styles.claimsSummary}>
            {result.total_claims} claims analyzed
          </Text>
        </View>

        {/* Breakdown pills */}
        <View style={styles.breakdown}>
          <BreakdownPill count={result.verified} verdict="VERIFIED" />
          <BreakdownPill count={result.false} verdict="FALSE" />
          <BreakdownPill count={result.unverifiable} verdict="UNVERIFIABLE" />
        </View>

        {/* Processing time */}
        {result.processing_time_ms && (
          <Text style={styles.processingTime}>
            Analyzed in {(result.processing_time_ms / 1000).toFixed(1)}s
          </Text>
        )}

        {/* Share button */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareResult}>
          <Text style={styles.shareBtnText}>📤 Share Results</Text>
        </TouchableOpacity>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {(['all', 'VERIFIED', 'FALSE', 'UNVERIFIABLE'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f === 'all' ? `All (${result.total_claims})` :
                 f === 'VERIFIED' ? `✓ Verified (${result.verified})` :
                 f === 'FALSE' ? `✗ False (${result.false})` :
                 `? Unverifiable (${result.unverifiable})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Claims list */}
        <View style={styles.claimsList}>
          {filteredClaims.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No claims in this category</Text>
            </View>
          ) : (
            filteredClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onPress={handleClaimPress}
              />
            ))
          )}
        </View>

        {/* Verified Answer */}
        {result.verified_answer && (
          <View style={styles.verifiedAnswer}>
            <Text style={styles.verifiedAnswerTitle}>✨ Verified Answer</Text>
            <Text style={styles.verifiedAnswerText}>{result.verified_answer}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownPill({ count, verdict }: { count: number; verdict: 'VERIFIED' | 'FALSE' | 'UNVERIFIABLE' }) {
  return (
    <View style={styles.pill}>
      <VerdictBadge verdict={verdict} size="sm" />
      <Text style={styles.pillCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textSecondary, marginBottom: Spacing.base },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    backgroundColor: Colors.surface,
    margin: Spacing.xl,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  trustLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginTop: Spacing.md,
  },
  claimsSummary: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.sm,
    fontFamily: 'Inter_400Regular',
    marginTop: Spacing.xs,
  },
  breakdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.base,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pillCount: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontFamily: 'Inter_700Bold' },
  processingTime: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  shareBtn: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.base,
  },
  shareBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_500Medium' },
  filterRow: { marginBottom: Spacing.base },
  filterContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterTabActive: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: Colors.primary,
  },
  filterTabText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  filterTabTextActive: { color: Colors.primary },
  claimsList: { paddingHorizontal: Spacing.xl },
  noResults: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  noResultsText: { color: Colors.textMuted, fontSize: Typography.fontSize.base },
  verifiedAnswer: {
    marginHorizontal: Spacing.xl,
    backgroundColor: `${Colors.primary}08`,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: `${Colors.primary}25`,
  },
  verifiedAnswerTitle: {
    color: Colors.primary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_700Bold',
    marginBottom: Spacing.md,
  },
  verifiedAnswerText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
});
