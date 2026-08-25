// app/verify/claim-detail.tsx — Claim Detail Screen
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Claim } from '../../types';
import { VerdictBadge } from '../../components/VerdictBadge';
import {
  Colors, Typography, Spacing, BorderRadius, SEVERITY_CONFIG,
} from '../../constants/theme';

export default function ClaimDetailScreen() {
  const { claim: claimStr } = useLocalSearchParams<{ claim: string }>();
  const claim: Claim = claimStr ? JSON.parse(claimStr) : null;

  if (!claim) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ color: Colors.textSecondary }}>Claim not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const severityConfig = claim.severity ? SEVERITY_CONFIG[claim.severity] : null;
  const confidenceColor =
    (claim.confidence ?? 0) >= 80 ? Colors.verified :
    (claim.confidence ?? 0) >= 50 ? Colors.unverifiable :
    Colors.false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Claim text */}
        <View style={styles.claimBox}>
          <Text style={styles.claimLabel}>ORIGINAL CLAIM</Text>
          <Text style={styles.claimText}>"{claim.text}"</Text>
        </View>

        {/* Verdict + confidence row */}
        <View style={styles.verdictRow}>
          {claim.verdict && <VerdictBadge verdict={claim.verdict} size="lg" />}
          <View style={styles.confidenceBox}>
            <Text style={[styles.confidenceValue, { color: confidenceColor }]}>
              {claim.confidence ?? '—'}%
            </Text>
            <Text style={styles.confidenceLabel}>Confidence</Text>
          </View>
          {claim.severity && severityConfig && claim.verdict !== 'VERIFIED' && (
            <View style={[styles.severityBox, { backgroundColor: severityConfig.bg }]}>
              <Text style={[styles.severityText, { color: severityConfig.color }]}>
                {claim.severity}
              </Text>
              <Text style={[styles.severityLabel, { color: severityConfig.color }]}>Severity</Text>
            </View>
          )}
        </View>

        {/* Claim meta */}
        <View style={styles.metaRow}>
          <MetaChip label="Type" value={claim.claim_type?.replace(/_/g, ' ') ?? 'general'} />
          <MetaChip label="Importance" value={claim.importance ?? 'medium'} />
        </View>

        {/* Reasoning */}
        {claim.reasoning && (
          <Section title="📋 Reasoning">
            <Text style={styles.bodyText}>{claim.reasoning}</Text>
          </Section>
        )}

        {/* Correction */}
        {claim.correction && (
          <Section title="✏️ Correction">
            <View style={styles.correctionCard}>
              <Text style={styles.correctionLabel}>Original</Text>
              <Text style={styles.correctionOriginal}>"{claim.text}"</Text>
              <View style={styles.correctionDivider} />
              <Text style={styles.correctionLabel}>Corrected</Text>
              <Text style={styles.correctionText}>{claim.correction}</Text>
              {claim.correction_evidence && (
                <>
                  <View style={styles.correctionDivider} />
                  <Text style={styles.correctionLabel}>Evidence basis</Text>
                  <Text style={styles.bodyText}>{claim.correction_evidence}</Text>
                </>
              )}
            </View>
          </Section>
        )}

        {/* Evidence */}
        {claim.evidence && claim.evidence.length > 0 && (
          <Section title={`🔍 Evidence (${claim.evidence.length} sources)`}>
            {claim.evidence.map((ev, i) => (
              <View key={ev.id} style={styles.evidenceCard}>
                <Text style={styles.evidenceSnippet}>"{ev.snippet}"</Text>
                <View style={styles.sourceRow}>
                  <View style={styles.sourceInfo}>
                    <Text style={styles.sourceTitle} numberOfLines={1}>
                      {ev.source.title || ev.source.url}
                    </Text>
                    {ev.source.publisher && (
                      <Text style={styles.sourcePublisher}>{ev.source.publisher}</Text>
                    )}
                  </View>
                  {ev.source.quality_score !== undefined && (
                    <View style={styles.qualityBadge}>
                      <Text style={styles.qualityScore}>{ev.source.quality_score}</Text>
                      <Text style={styles.qualityLabel}>/100</Text>
                    </View>
                  )}
                </View>
                {ev.source.quality_reasons && ev.source.quality_reasons.length > 0 && (
                  <View style={styles.reasonsRow}>
                    {ev.source.quality_reasons.slice(0, 2).map((r, ri) => (
                      <View key={ri} style={styles.reasonChip}>
                        <Text style={styles.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => Linking.openURL(ev.source.url)}
                  style={styles.openSourceBtn}
                >
                  <Text style={styles.openSourceText}>Open Source →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Section>
        )}

        {claim.evidence?.length === 0 && (
          <Section title="🔍 Evidence">
            <Text style={styles.bodyText}>No evidence was retrieved for this claim.</Text>
          </Section>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl },
  claimBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
  },
  claimLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  claimText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontFamily: 'Inter_400Regular',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  verdictRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    flexWrap: 'wrap',
  },
  confidenceBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  confidenceValue: { fontSize: Typography.fontSize.xl, fontFamily: 'Inter_700Bold' },
  confidenceLabel: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Inter_500Medium' },
  severityBox: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  severityText: { fontSize: Typography.fontSize.base, fontFamily: 'Inter_700Bold' },
  severityLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  metaRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  metaChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  metaLabel: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  metaValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_700Bold',
    marginBottom: Spacing.md,
  },
  bodyText: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  correctionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  correctionLabel: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginBottom: Spacing.xs },
  correctionOriginal: { color: Colors.false, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_400Regular', fontStyle: 'italic', marginBottom: Spacing.md },
  correctionDivider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: Spacing.md },
  correctionText: { color: Colors.verified, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_500Medium', lineHeight: 18 },
  evidenceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
  },
  evidenceSnippet: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing.sm,
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  sourceInfo: { flex: 1 },
  sourceTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_600SemiBold' },
  sourcePublisher: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_400Regular', marginTop: 2 },
  qualityBadge: { flexDirection: 'row', alignItems: 'baseline' },
  qualityScore: { color: Colors.accent, fontSize: Typography.fontSize.md, fontFamily: 'Inter_700Bold' },
  qualityLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_400Regular' },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  reasonChip: { backgroundColor: `${Colors.primary}12`, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  reasonText: { color: Colors.primary, fontSize: 10, fontFamily: 'Inter_500Medium' },
  openSourceBtn: { paddingTop: Spacing.sm },
  openSourceText: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_600SemiBold' },
});
