// app/(tabs)/index.tsx — Home Dashboard
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '../../services/storage';
import { VerificationResult } from '../../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows, TRUST_SCORE_CONFIG } from '../../constants/theme';

const ACTION_CARDS = [
  { icon: '📝', label: 'Verify Text', desc: 'Paste AI response', route: '/verify/index', primary: true },
  { icon: '📤', label: 'Share to Verify', desc: 'Share from any app', route: '/verify/index', primary: false },
  { icon: '📸', label: 'Scan Screenshot', desc: 'OCR verification', route: '/screenshot', primary: false },
  { icon: '📄', label: 'Upload Document', desc: 'PDF / DOCX / TXT', route: '/verify/index', primary: false },
];

export default function HomeScreen() {
  const [history, setHistory] = useState<VerificationResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(20);

  useEffect(() => {
    loadHistory();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadHistory = async () => {
    const h = await storage.getHistory();
    setHistory(h.slice(0, 5));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const totalClaims = history.reduce((s, h) => s + (h.total_claims || 0), 0);
  const totalFalse = history.reduce((s, h) => s + (h.false || 0), 0);
  const avgTrust = history.length > 0
    ? Math.round(history.reduce((s, h) => s + (h.trust_score || 0), 0) / history.length)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hallucination</Text>
              <Text style={styles.appName}>Hunter 🎯</Text>
            </View>
            <View style={styles.statusDot} />
          </View>

          {/* Stats Row */}
          {history.length > 0 && (
            <View style={styles.statsRow}>
              <StatCard label="Avg Trust" value={avgTrust !== null ? `${avgTrust}` : '—'} unit="/100" color={avgTrust !== null ? TRUST_SCORE_CONFIG(avgTrust).color : Colors.textMuted} />
              <StatCard label="Claims Checked" value={String(totalClaims)} color={Colors.accent} />
              <StatCard label="False Detected" value={String(totalFalse)} color={Colors.false} />
            </View>
          )}

          {/* Primary Action */}
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => router.push('/verify/index')}
            activeOpacity={0.85}
          >
            <View style={styles.primaryActionIcon}>
              <Text style={{ fontSize: 32 }}>🔍</Text>
            </View>
            <View style={styles.primaryActionText}>
              <Text style={styles.primaryActionTitle}>Verify AI Response</Text>
              <Text style={styles.primaryActionDesc}>Paste text to check claims</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Quick actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {ACTION_CARDS.slice(1).map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                onPress={() => router.push(action.route as never)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionDesc}>{action.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Demo button */}
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => router.push({ pathname: '/verify/index', params: { demo: '1' } })}
          >
            <Text style={styles.demoBtnText}>✨ Try Demo Verification</Text>
          </TouchableOpacity>

          {/* Recent history */}
          {history.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent</Text>
                <TouchableOpacity onPress={() => router.push('/history/index')}>
                  <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
              </View>
              {history.slice(0, 3).map((item) => (
                <RecentItem
                  key={item.verification_id}
                  item={item}
                  onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.verification_id } })}
                />
              ))}
            </>
          )}

          {history.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyTitle}>No verifications yet</Text>
              <Text style={styles.emptyDesc}>Paste an AI response above to get started.</Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RecentItem({ item, onPress }: { item: VerificationResult; onPress: () => void }) {
  const score = item.trust_score;
  const scoreConfig = score !== undefined ? TRUST_SCORE_CONFIG(score) : null;
  const date = new Date(item.created_at).toLocaleDateString();

  return (
    <TouchableOpacity style={styles.recentItem} onPress={onPress}>
      <View style={styles.recentLeft}>
        <Text style={styles.recentDate}>{date}</Text>
        <Text style={styles.recentClaims}>
          {item.total_claims} claims · {item.false} false · {item.unverifiable} unverifiable
        </Text>
      </View>
      {score !== undefined && scoreConfig && (
        <View style={[styles.recentScore, { borderColor: `${scoreConfig.color}40` }]}>
          <Text style={[styles.recentScoreText, { color: scoreConfig.color }]}>{score}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  greeting: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_400Regular' },
  appName: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accentGreen },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.base,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statValue: { fontSize: Typography.fontSize.xl, fontFamily: 'Inter_700Bold' },
  statUnit: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, marginBottom: 3, fontFamily: 'Inter_400Regular' },
  statLabel: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: `${Colors.primary}15`,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}40`,
    ...Shadows.md,
  },
  primaryActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}25`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  primaryActionText: { flex: 1 },
  primaryActionTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontFamily: 'Inter_700Bold' },
  primaryActionDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_400Regular', marginTop: 2 },
  arrow: { color: Colors.primary, fontSize: Typography.fontSize.xl, fontFamily: 'Inter_700Bold' },
  sectionTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: Spacing.xl, marginTop: Spacing.xl },
  seeAll: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: Spacing.base, gap: Spacing.md, marginBottom: Spacing.xl },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  actionIcon: { fontSize: 28, marginBottom: Spacing.sm },
  actionLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_600SemiBold' },
  actionDesc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_400Regular', marginTop: 2 },
  demoBtn: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: `${Colors.accent}10`,
    borderWidth: 1,
    borderColor: `${Colors.accent}30`,
    marginBottom: Spacing.xl,
  },
  demoBtnText: { color: Colors.accent, fontSize: Typography.fontSize.base, fontFamily: 'Inter_600SemiBold' },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  recentLeft: { flex: 1 },
  recentDate: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  recentClaims: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_400Regular' },
  recentScore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  recentScoreText: { fontSize: Typography.fontSize.base, fontFamily: 'Inter_700Bold' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['3xl'], paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontFamily: 'Inter_600SemiBold', marginBottom: Spacing.sm },
  emptyDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
});
