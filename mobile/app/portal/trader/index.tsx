// app/portal/trader/index.tsx — Trader Dashboard
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { instrumentService } from '../../../services/instrumentService';
import { Instrument, UserProfile, VerificationApplication } from '../../../types/instrument';

export default function TraderDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'due'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const currentUser = await instrumentService.getCurrentUser();
    setUser(currentUser);
    const instList = await instrumentService.listInstruments(currentUser.id);
    setInstruments(instList);
    const appList = await instrumentService.listApplications(currentUser.id);
    setApplications(appList);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Metrics
  const totalCount = instruments.length;
  const verifiedCount = instruments.filter((i) => i.status === 'active_verified').length;
  const pendingCount = instruments.filter((i) => i.status === 'pending_verification').length;
  const dueCount = instruments.filter(
    (i) => i.status === 'reverification_due' || i.status === 'expired'
  ).length;

  // Filtered Instruments
  const filteredInstruments = instruments.filter((item) => {
    const matchesSearch =
      item.makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'verified') return item.status === 'active_verified';
    if (statusFilter === 'pending') return item.status === 'pending_verification';
    if (statusFilter === 'due') return item.status === 'reverification_due' || item.status === 'expired';
    return true;
  });

  const getStatusBadge = (status: Instrument['status']) => {
    switch (status) {
      case 'active_verified':
        return { label: 'VERIFIED & STAMPED', color: Colors.verified, bg: Colors.verifiedBg, border: Colors.verifiedBorder };
      case 'pending_verification':
        return { label: 'VERIFICATION PENDING', color: Colors.accent, bg: `${Colors.accent}15`, border: `${Colors.accent}30` };
      case 'reverification_due':
        return { label: 'RE-VERIFICATION DUE', color: Colors.unverifiable, bg: Colors.unverifiableBg, border: Colors.unverifiableBorder };
      case 'expired':
        return { label: 'EXPIRED / VOID', color: Colors.false, bg: Colors.falseBg, border: Colors.falseBorder };
      default:
        return { label: 'REJECTED', color: Colors.false, bg: Colors.falseBg, border: Colors.falseBorder };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'electronic_scale':
        return '⚖️';
      case 'weighbridge':
        return '🚛';
      case 'fuel_dispenser':
        return '⛽';
      case 'flow_meter':
        return '💧';
      case 'platform_scale':
        return '📦';
      default:
        return '⚙️';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.replace('/home' as never)}>
            <Text style={styles.navLink}>← Main Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.switchRoleBtn}
            onPress={() => router.push('/portal/auth' as never)}
          >
            <Text style={styles.switchRoleText}>Switch Role / Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Business Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <View style={styles.businessBadge}>
              <Text style={styles.businessBadgeText}>TRADER PORTAL</Text>
            </View>
            <Text style={styles.businessName}>{user?.businessName || 'Trading Enterprise'}</Text>
            <Text style={styles.traderDetails}>
              Proprietor: {user?.name} · License: {user?.tradeLicenseNumber || 'TL-2024-DEL'}
            </Text>
            <Text style={styles.traderAddress}>{user?.address || 'Commercial Market Premises'}</Text>
          </View>
        </View>

        {/* Overview Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>Instruments</Text>
          </View>
          <View style={[styles.statCard, { borderColor: `${Colors.verified}40` }]}>
            <Text style={[styles.statNumber, { color: Colors.verified }]}>{verifiedCount}</Text>
            <Text style={styles.statLabel}>Verified & Active</Text>
          </View>
          <View style={[styles.statCard, { borderColor: `${Colors.accent}40` }]}>
            <Text style={[styles.statNumber, { color: Colors.accent }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Applications</Text>
          </View>
          <View style={[styles.statCard, { borderColor: `${Colors.unverifiable}40` }]}>
            <Text style={[styles.statNumber, { color: Colors.unverifiable }]}>{dueCount}</Text>
            <Text style={styles.statLabel}>Re-verify Due</Text>
          </View>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryActionBtn]}
            onPress={() => router.push('/portal/trader/register-instrument' as never)}
          >
            <Text style={styles.actionBtnIcon}>➕</Text>
            <Text style={styles.primaryActionBtnText}>Register Instrument</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryActionBtn]}
            onPress={() => router.push('/portal/trader/apply-verification' as never)}
          >
            <Text style={styles.actionBtnIcon}>📋</Text>
            <Text style={styles.actionBtnText}>Apply for Verification</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryActionBtn]}
            onPress={() => router.push('/portal/trader/applications' as never)}
          >
            <Text style={styles.actionBtnIcon}>⏱️</Text>
            <Text style={styles.actionBtnText}>Track Applications ({applications.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.aiActionBtn]}
            onPress={() => router.push('/portal/ai-assistant' as never)}
          >
            <Text style={styles.actionBtnIcon}>🤖</Text>
            <Text style={styles.aiActionBtnText}>AI Regulatory Assistant</Text>
          </TouchableOpacity>
        </View>

        {/* Instruments Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Registered Instruments</Text>
            <Text style={styles.sectionSub}>Statutory inventory and verification statuses</Text>
          </View>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.filterContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by make, model, or serial number..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.filterPills}>
            {(['all', 'verified', 'pending', 'due'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.pill, statusFilter === tab && styles.activePill]}
                onPress={() => setStatusFilter(tab)}
              >
                <Text style={[styles.pillText, statusFilter === tab && styles.activePillText]}>
                  {tab === 'all'
                    ? `All (${instruments.length})`
                    : tab === 'verified'
                    ? `Verified (${verifiedCount})`
                    : tab === 'pending'
                    ? `Pending (${pendingCount})`
                    : `Due (${dueCount})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Instrument Cards List */}
        {filteredInstruments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Instruments Found</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? 'No registered instruments match your search criteria.'
                : 'You have not registered any weighing or measuring instruments yet.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/portal/trader/register-instrument' as never)}
            >
              <Text style={styles.emptyBtnText}>+ Register Your First Instrument</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredInstruments.map((inst) => {
            const badge = getStatusBadge(inst.status);
            return (
              <View key={inst.id} style={styles.instrumentCard}>
                <View style={styles.instrumentCardHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryIcon}>{getCategoryIcon(inst.category)}</Text>
                    <Text style={styles.categoryTitle}>{inst.categoryLabel}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: badge.bg, borderColor: badge.border },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.instrumentBody}>
                  <Text style={styles.makeModelText}>{inst.makeModel}</Text>
                  <Text style={styles.serialText}>
                    Serial No: <Text style={styles.codeText}>{inst.serialNumber}</Text> · Class:{' '}
                    <Text style={styles.codeText}>{inst.accuracyClass}</Text>
                  </Text>

                  <View style={styles.specsRow}>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Capacity</Text>
                      <Text style={styles.specValue}>{inst.capacity}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Scale Interval (e)</Text>
                      <Text style={styles.specValue}>{inst.verificationInterval}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Premises Location</Text>
                      <Text style={styles.specValue} numberOfLines={1}>
                        {inst.premisesLocation}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Footer Actions */}
                <View style={styles.cardFooter}>
                  {inst.currentCertificateId ? (
                    <TouchableOpacity
                      style={styles.certLinkBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/portal/verify-certificate' as never,
                          params: { id: inst.currentCertificateId },
                        })
                      }
                    >
                      <Text style={styles.certLinkIcon}>📜</Text>
                      <Text style={styles.certLinkText}>
                        Certificate: {inst.currentCertificateId}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noCertText}>No Certificate Issued</Text>
                  )}

                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/portal/trader/apply-verification' as never,
                        params: { instrumentId: inst.id },
                      })
                    }
                  >
                    <Text style={styles.applyBtnText}>
                      {inst.status === 'active_verified' ? 'Re-verify' : 'Apply to Verify'} →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.xl, paddingBottom: 60, maxWidth: 1000, width: '100%', alignSelf: 'center' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  navLink: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  switchRoleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  switchRoleText: { color: Colors.accent, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  headerLeft: { flex: 1 },
  businessBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E2540',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  businessBadgeText: { color: Colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  businessName: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '800' },
  traderDetails: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  traderAddress: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statNumber: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  actionsBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.xl },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  primaryActionBtn: { backgroundColor: Colors.primary },
  primaryActionBtnText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  secondaryActionBtn: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  actionBtnText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  aiActionBtn: {
    backgroundColor: `${Colors.accent}15`,
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
  },
  aiActionBtnText: { color: Colors.accent, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  actionBtnIcon: { fontSize: 16 },
  sectionHeader: { marginBottom: Spacing.md },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '800' },
  sectionSub: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
  filterContainer: { marginBottom: Spacing.base },
  searchInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 10,
  },
  filterPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  activePill: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  activePillText: { color: Colors.white, fontWeight: '700' },
  instrumentCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  instrumentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryIcon: { fontSize: 18 },
  categoryTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  instrumentBody: { marginBottom: Spacing.md },
  makeModelText: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', marginBottom: 2 },
  serialText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginBottom: Spacing.sm },
  codeText: { color: Colors.textPrimary, fontFamily: 'monospace', fontWeight: '700' },
  specsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 12,
  },
  specItem: { flex: 1 },
  specLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  specValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '600', marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.sm,
  },
  certLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  certLinkIcon: { fontSize: 14 },
  certLinkText: { color: Colors.accent, fontSize: Typography.fontSize.xs, fontWeight: '700', textDecorationLine: 'underline' },
  noCertText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontStyle: 'italic' },
  applyBtn: {
    backgroundColor: `${Colors.primary}20`,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  applyBtnText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginVertical: Spacing.xl,
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
  emptyDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', marginTop: 4, maxWidth: 360 },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  emptyBtnText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '700' },
});
