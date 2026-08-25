// app/history/[id].tsx — History Detail Screen (reproduces full report)
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerificationResult, Claim } from '../../types';
import { TrustScoreGauge } from '../../components/TrustScoreGauge';
import { ClaimCard } from '../../components/ClaimCard';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function HistoryDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const result: VerificationResult | null = data ? JSON.parse(data) : null;

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ color: Colors.textSecondary }}>Result not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const date = new Date(result.created_at);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Timestamp */}
        <View style={styles.timestamp}>
          <Text style={styles.timestampText}>
            {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Trust score */}
        <View style={styles.scoreCard}>
          <TrustScoreGauge score={result.trust_score ?? 0} size="lg" animate />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox label="Total" value={result.total_claims} />
          <StatBox label="Verified" value={result.verified} color={Colors.verified} />
          <StatBox label="False" value={result.false} color={Colors.false} />
          <StatBox label="Unverifiable" value={result.unverifiable} color={Colors.unverifiable} />
        </View>

        {/* Claims */}
        {result.claims && result.claims.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Claims</Text>
            {result.claims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onPress={(c: Claim) => router.push({ pathname: '/verify/claim-detail', params: { claim: JSON.stringify(c) } })}
              />
            ))}
          </>
        ) : (
          <View style={styles.noClaims}>
            <Text style={styles.noClaimsText}>Claim details are not stored locally.</Text>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl },
  timestamp: { marginBottom: Spacing.xl, alignItems: 'center' },
  timestampText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_400Regular' },
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing['3xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontFamily: 'Inter_700Bold' },
  statLabel: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  noClaims: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  noClaimsText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
});
