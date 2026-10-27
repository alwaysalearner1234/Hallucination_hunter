// app/portal/trader/applications.tsx — Application Tracking & Certificate Access
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { instrumentService } from '../../../services/instrumentService';
import { downloadCertificatePdf } from '../../../services/certificatePdf';
import { VerificationApplication, ApplicationStatus } from '../../../types/instrument';

const STAGES: { key: ApplicationStatus; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'inspection_scheduled', label: 'Scheduled' },
  { key: 'verified', label: 'Verified & Stamped' },
];

export default function ApplicationsScreen() {
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const user = await instrumentService.getCurrentUser();
    const list = await instrumentService.listApplications(user.id);
    setApplications(list);
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

  const getStageIndex = (status: ApplicationStatus): number => {
    switch (status) {
      case 'submitted':
        return 0;
      case 'under_review':
        return 1;
      case 'assigned':
        return 2;
      case 'inspection_scheduled':
        return 3;
      case 'verified':
      case 'rejected':
        return 4;
      default:
        return 0;
    }
  };

  const filteredApps = applications.filter((app) => {
    if (filter === 'active') return app.status !== 'verified' && app.status !== 'rejected';
    if (filter === 'completed') return app.status === 'verified' || app.status === 'rejected';
    return true;
  });

  const handleDownloadPdf = async (certId: string) => {
    const cert = await instrumentService.getCertificateById(certId);
    if (cert) {
      await downloadCertificatePdf(cert);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.replace('/portal/trader' as never)}>
            <Text style={styles.navText}>← Back to Trader Portal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyNewBtn}
            onPress={() => router.push('/portal/trader/apply-verification' as never)}
          >
            <Text style={styles.applyNewText}>+ New Application</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Application Tracking</Text>
          <Text style={styles.subtitle}>
            Monitor statutory inspection progress, assignment, and download issued certificates.
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['all', 'active', 'completed'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filter === tab && styles.activeFilterTab]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterTabText, filter === tab && styles.activeFilterTabText]}>
                {tab === 'all'
                  ? `All Applications (${applications.length})`
                  : tab === 'active'
                  ? `In Progress (${applications.filter((a) => a.status !== 'verified' && a.status !== 'rejected').length})`
                  : `Completed (${applications.filter((a) => a.status === 'verified' || a.status === 'rejected').length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⏱️</Text>
            <Text style={styles.emptyTitle}>No Applications Found</Text>
            <Text style={styles.emptyDesc}>
              You do not have any verification applications in this category.
            </Text>
          </View>
        ) : (
          filteredApps.map((app) => {
            const currentStageIdx = getStageIndex(app.status);
            const isVerified = app.status === 'verified';
            const isRejected = app.status === 'rejected';

            return (
              <View key={app.id} style={styles.appCard}>
                {/* Header */}
                <View style={styles.appHeader}>
                  <View>
                    <Text style={styles.appIdText}>{app.id}</Text>
                    <Text style={styles.appTypeTitle}>{app.applicationTypeLabel}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isVerified
                        ? styles.statusVerified
                        : isRejected
                        ? styles.statusRejected
                        : styles.statusInProgress,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isVerified
                          ? styles.textVerified
                          : isRejected
                          ? styles.textRejected
                          : styles.textInProgress,
                      ]}
                    >
                      {app.status.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Instrument Info */}
                <View style={styles.instSnippet}>
                  <Text style={styles.instMakeText}>{app.instrumentSnapshot.makeModel}</Text>
                  <Text style={styles.instDetailsText}>
                    Serial: <Text style={styles.codeText}>{app.instrumentSnapshot.serialNumber}</Text> ·{' '}
                    {app.instrumentSnapshot.capacity} · {app.instrumentSnapshot.accuracyClass}
                  </Text>
                  <Text style={styles.instLocText}>📍 {app.instrumentSnapshot.premisesLocation}</Text>
                </View>

                {/* Visual Progress Timeline */}
                <View style={styles.timelineContainer}>
                  <Text style={styles.timelineTitle}>Statutory Verification Lifecycle</Text>
                  <View style={styles.stagesRow}>
                    {STAGES.map((st, idx) => {
                      const isPast = idx < currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <View key={st.key} style={styles.stageItem}>
                          <View
                            style={[
                              styles.stageNode,
                              isPast && styles.stageNodePast,
                              isCurrent &&
                                (isVerified
                                  ? styles.stageNodeVerified
                                  : isRejected
                                  ? styles.stageNodeRejected
                                  : styles.stageNodeCurrent),
                            ]}
                          >
                            <Text style={styles.stageNodeText}>
                              {isPast ? '✓' : isRejected && isCurrent ? '✗' : idx + 1}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.stageLabel,
                              (isPast || isCurrent) && styles.stageLabelActive,
                            ]}
                            numberOfLines={1}
                          >
                            {isRejected && idx === 4 ? 'Rejected' : st.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Submitted</Text>
                    <Text style={styles.metaValue}>{app.submittedAt}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Assigned Inspector</Text>
                    <Text style={styles.metaValue}>
                      {app.assignedOfficerName
                        ? `${app.assignedOfficerName} (${app.assignedOfficerBadge})`
                        : 'Awaiting Assignment'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Scheduled Inspection</Text>
                    <Text style={styles.metaValue}>
                      {app.scheduledDate
                        ? `${app.scheduledDate} · ${app.scheduledTimeSlot || 'Morning'}`
                        : 'To be scheduled'}
                    </Text>
                  </View>
                </View>

                {/* Certificate Action If Verified */}
                {isVerified && app.certificateId && (
                  <View style={styles.verifiedBox}>
                    <View style={styles.verifiedHeader}>
                      <Text style={styles.verifiedTitle}>
                        🏆 Official Certificate Issued: <Text style={styles.codeText}>{app.certificateId}</Text>
                      </Text>
                    </View>
                    <View style={styles.certButtonsRow}>
                      <TouchableOpacity
                        style={styles.viewCertBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/portal/verify-certificate' as never,
                            params: { id: app.certificateId },
                          })
                        }
                      >
                        <Text style={styles.viewCertText}>🔍 Public QR Verification</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.downloadPdfBtn}
                        onPress={() => handleDownloadPdf(app.certificateId!)}
                      >
                        <Text style={styles.downloadPdfText}>📥 Download Official PDF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Defect Notice If Rejected */}
                {isRejected && (
                  <View style={styles.rejectedBox}>
                    <Text style={styles.rejectedTitle}>⚠️ Statutory Defect Notice</Text>
                    <Text style={styles.rejectedDesc}>
                      The instrument did not comply with Maximum Permissible Error (MPE) thresholds under Schedule IX. Maintenance or re-calibration is required before re-applying.
                    </Text>
                  </View>
                )}
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
  container: { padding: Spacing.xl, paddingBottom: 60, maxWidth: 900, width: '100%', alignSelf: 'center' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  navText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  applyNewBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.md },
  applyNewText: { color: Colors.white, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  header: { marginBottom: Spacing.lg },
  title: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  filterTabs: { flexDirection: 'row', backgroundColor: Colors.surface, padding: 4, borderRadius: BorderRadius.md, marginBottom: Spacing.xl },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  activeFilterTab: { backgroundColor: Colors.primary },
  filterTabText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  activeFilterTabText: { color: Colors.white, fontWeight: '700' },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing['2xl'], alignItems: 'center' },
  emptyIcon: { fontSize: 44, marginBottom: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
  emptyDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  appCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  appIdText: { color: Colors.accent, fontSize: Typography.fontSize.xs, fontFamily: 'monospace', fontWeight: '700' },
  appTypeTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusVerified: { backgroundColor: Colors.verifiedBg, borderColor: Colors.verifiedBorder },
  statusRejected: { backgroundColor: Colors.falseBg, borderColor: Colors.falseBorder },
  statusInProgress: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}40` },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  textVerified: { color: Colors.verified },
  textRejected: { color: Colors.false },
  textInProgress: { color: Colors.primaryLight },
  instSnippet: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  instMakeText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  instDetailsText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
  codeText: { color: Colors.textPrimary, fontFamily: 'monospace', fontWeight: '700' },
  instLocText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  timelineContainer: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  timelineTitle: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  stagesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stageItem: { alignItems: 'center', flex: 1 },
  stageNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stageNodePast: { backgroundColor: Colors.accentGreen },
  stageNodeCurrent: { backgroundColor: Colors.primary },
  stageNodeVerified: { backgroundColor: Colors.verified },
  stageNodeRejected: { backgroundColor: Colors.false },
  stageNodeText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
  stageLabel: { color: Colors.textMuted, fontSize: 9, textAlign: 'center' },
  stageLabelActive: { color: Colors.textPrimary, fontWeight: '600' },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metaItem: { minWidth: '45%', flex: 1 },
  metaLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  metaValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '600', marginTop: 2 },
  verifiedBox: {
    marginTop: Spacing.md,
    backgroundColor: `${Colors.verified}12`,
    borderWidth: 1,
    borderColor: `${Colors.verified}40`,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  verifiedHeader: { marginBottom: Spacing.sm },
  verifiedTitle: { color: Colors.verified, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  certButtonsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  viewCertBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
  },
  viewCertText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  downloadPdfBtn: {
    backgroundColor: Colors.verified,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
  },
  downloadPdfText: { color: '#0A0A0F', fontSize: 12, fontWeight: '800' },
  rejectedBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.falseBg,
    borderWidth: 1,
    borderColor: Colors.falseBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  rejectedTitle: { color: Colors.false, fontSize: Typography.fontSize.sm, fontWeight: '800', marginBottom: 2 },
  rejectedDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
});
