// app/portal/admin/index.tsx — Admin & Inspector Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { instrumentService, DEMO_USERS } from '../../../services/instrumentService';
import { downloadCertificatePdf } from '../../../services/certificatePdf';
import { VerificationApplication, UserProfile } from '../../../types/instrument';

const OFFICERS_LIST = [
  { id: 'USR-INS-202', name: 'Insp. Vikram Malhotra', badge: 'LM-INSP-408' },
  { id: 'USR-INS-203', name: 'Insp. Priya Sharma', badge: 'LM-INSP-312' },
  { id: 'USR-INS-204', name: 'Insp. Amit Verma', badge: 'LM-INSP-515' },
];

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending_assignment' | 'scheduled' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Assignment Modal State
  const [assignModalApp, setAssignModalApp] = useState<VerificationApplication | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(OFFICERS_LIST[0].id);

  // Scheduling Modal State
  const [scheduleModalApp, setScheduleModalApp] = useState<VerificationApplication | null>(null);
  const [scheduledDate, setScheduledDate] = useState('2026-11-05');
  const [scheduledSlot, setScheduledSlot] = useState('11:00 AM - 01:00 PM');
  const [inspectionNotes, setInspectionNotes] = useState('Bring 20kg calibrated test weights Class M1');

  // Outcome / Testing Modal State
  const [outcomeModalApp, setOutcomeModalApp] = useState<VerificationApplication | null>(null);
  const [decision, setDecision] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [zeroError, setZeroError] = useState('0.0 g');
  const [halfError, setHalfError] = useState('+1.0 g');
  const [maxError, setMaxError] = useState('+2.0 g');
  const [testNotes, setTestNotes] = useState('All scale load points tested and verified within MPE tolerance limits.');
  const [savingAction, setSavingAction] = useState(false);

  const loadData = async () => {
    const user = await instrumentService.getCurrentUser();
    setCurrentUser(user);
    const list = await instrumentService.listApplications();
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

  // Metrics
  const totalCount = applications.length;
  const pendingAssignmentCount = applications.filter(
    (a) => a.status === 'submitted' || a.status === 'under_review'
  ).length;
  const scheduledCount = applications.filter((a) => a.status === 'inspection_scheduled').length;
  const verifiedCount = applications.filter((a) => a.status === 'verified').length;

  const filteredApps = applications.filter((app) => {
    if (activeTab === 'pending_assignment') {
      return app.status === 'submitted' || app.status === 'under_review';
    }
    if (activeTab === 'scheduled') {
      return app.status === 'assigned' || app.status === 'inspection_scheduled';
    }
    if (activeTab === 'completed') {
      return app.status === 'verified' || app.status === 'rejected';
    }
    return true;
  });

  // Action Handlers
  const handleConfirmAssignment = async () => {
    if (!assignModalApp) return;
    setSavingAction(true);
    try {
      const officer = OFFICERS_LIST.find((o) => o.id === selectedOfficerId)!;
      await instrumentService.assignInspector(assignModalApp.id, officer);
      setAssignModalApp(null);
      await loadData();
    } finally {
      setSavingAction(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleModalApp) return;
    setSavingAction(true);
    try {
      await instrumentService.scheduleInspection(
        scheduleModalApp.id,
        scheduledDate,
        scheduledSlot,
        inspectionNotes
      );
      setScheduleModalApp(null);
      await loadData();
    } finally {
      setSavingAction(false);
    }
  };

  const handleConfirmInspectionOutcome = async () => {
    if (!outcomeModalApp) return;
    setSavingAction(true);
    try {
      await instrumentService.recordInspectionResult(outcomeModalApp.id, decision, {
        zeroLoadError: zeroError,
        halfCapacityError: halfError,
        maxCapacityError: maxError,
        mpeLimit: decision === 'PASSED' ? 'Within MPE limits (Schedule IX)' : 'Exceeded MPE limits',
        sealsIntact: true,
        notes: testNotes,
      });
      setOutcomeModalApp(null);
      await loadData();
    } finally {
      setSavingAction(false);
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
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.replace('/home' as never)}>
            <Text style={styles.navText}>← Main Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.switchRoleBtn}
            onPress={() => router.push('/portal/auth' as never)}
          >
            <Text style={styles.switchRoleText}>Switch Role / Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Header */}
        <View style={styles.headerCard}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>DIRECTORATE OF LEGAL METROLOGY</Text>
          </View>
          <Text style={styles.adminTitle}>Admin & Inspector Command Center</Text>
          <Text style={styles.adminOfficer}>
            Officer: {currentUser?.name} ({currentUser?.badgeNumber || 'LM-HQ-001'})
          </Text>
          <Text style={styles.adminDept}>
            {currentUser?.division || 'Standards, Inspection & Verification Enforcement Directorate'}
          </Text>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{totalCount}</Text>
            <Text style={styles.metricLabel}>Total Applications</Text>
          </View>

          <View style={[styles.metricCard, { borderColor: `${Colors.accent}40` }]}>
            <Text style={[styles.metricNumber, { color: Colors.accent }]}>
              {pendingAssignmentCount}
            </Text>
            <Text style={styles.metricLabel}>Pending Assignment</Text>
          </View>

          <View style={[styles.metricCard, { borderColor: `${Colors.unverifiable}40` }]}>
            <Text style={[styles.metricNumber, { color: Colors.unverifiable }]}>
              {scheduledCount}
            </Text>
            <Text style={styles.metricLabel}>Scheduled Inspections</Text>
          </View>

          <View style={[styles.metricCard, { borderColor: `${Colors.verified}40` }]}>
            <Text style={[styles.metricNumber, { color: Colors.verified }]}>{verifiedCount}</Text>
            <Text style={styles.metricLabel}>Certificates Issued</Text>
          </View>
        </View>

        {/* Section Tabs */}
        <View style={styles.tabsHeader}>
          <Text style={styles.tabsHeading}>Statutory Applications Queue</Text>
          <View style={styles.tabsRow}>
            {(['all', 'pending_assignment', 'scheduled', 'completed'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'all'
                    ? `All (${applications.length})`
                    : tab === 'pending_assignment'
                    ? `To Assign (${pendingAssignmentCount})`
                    : tab === 'scheduled'
                    ? `Scheduled (${scheduledCount})`
                    : `Done (${verifiedCount})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Applications in this Queue</Text>
            <Text style={styles.emptyDesc}>All pending applications have been processed.</Text>
          </View>
        ) : (
          filteredApps.map((app) => {
            const isVerified = app.status === 'verified';
            const isRejected = app.status === 'rejected';

            return (
              <View key={app.id} style={styles.appCard}>
                {/* Header */}
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.appIdBadge}>{app.id}</Text>
                    <Text style={styles.cardBusinessTitle}>{app.businessName}</Text>
                    <Text style={styles.cardTraderSub}>
                      Applicant: {app.traderName} · Submitted: {app.submittedAt}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isVerified
                        ? styles.pillVerified
                        : isRejected
                        ? styles.pillRejected
                        : styles.pillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isVerified
                          ? styles.textVerified
                          : isRejected
                          ? styles.textRejected
                          : styles.textPending,
                      ]}
                    >
                      {app.status.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Instrument Specs */}
                <View style={styles.specsBox}>
                  <Text style={styles.specsMake}>{app.instrumentSnapshot.makeModel}</Text>
                  <Text style={styles.specsDetails}>
                    Category: {app.instrumentSnapshot.categoryLabel} · S/N:{' '}
                    <Text style={styles.codeText}>{app.instrumentSnapshot.serialNumber}</Text> · Class:{' '}
                    {app.instrumentSnapshot.accuracyClass}
                  </Text>
                  <Text style={styles.specsLoc}>
                    📍 Premises: {app.instrumentSnapshot.premisesLocation}
                  </Text>
                </View>

                {/* Officer & Schedule Status */}
                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaColLabel}>Assigned Officer</Text>
                    <Text style={styles.metaColValue}>
                      {app.assignedOfficerName
                        ? `${app.assignedOfficerName} (${app.assignedOfficerBadge})`
                        : 'Unassigned'}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaColLabel}>Inspection Slot</Text>
                    <Text style={styles.metaColValue}>
                      {app.scheduledDate
                        ? `${app.scheduledDate} · ${app.scheduledTimeSlot}`
                        : 'Not yet scheduled'}
                    </Text>
                  </View>
                </View>

                {/* Interactive Action Buttons for Admin/Inspector */}
                <View style={styles.actionButtonsRow}>
                  {/* Step 1 Action: Assign Officer */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.assignBtn]}
                    onPress={() => setAssignModalApp(app)}
                  >
                    <Text style={styles.actionBtnIcon}>👤</Text>
                    <Text style={styles.assignBtnText}>
                      {app.assignedOfficerName ? 'Reassign Officer' : 'Assign Inspector'}
                    </Text>
                  </TouchableOpacity>

                  {/* Step 2 Action: Schedule Date */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.scheduleBtn]}
                    onPress={() => setScheduleModalApp(app)}
                  >
                    <Text style={styles.actionBtnIcon}>📅</Text>
                    <Text style={styles.scheduleBtnText}>Schedule Inspection</Text>
                  </TouchableOpacity>

                  {/* Step 3 Action: Record Testing Outcome & Stamp */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.outcomeBtn]}
                    onPress={() => setOutcomeModalApp(app)}
                  >
                    <Text style={styles.actionBtnIcon}>⚖️</Text>
                    <Text style={styles.outcomeBtnText}>Record Inspection & Test</Text>
                  </TouchableOpacity>

                  {/* Certificate Quick Access if verified */}
                  {isVerified && app.certificateId && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.certBtn]}
                      onPress={() =>
                        router.push({
                          pathname: '/portal/verify-certificate' as never,
                          params: { id: app.certificateId },
                        })
                      }
                    >
                      <Text style={styles.actionBtnIcon}>📜</Text>
                      <Text style={styles.certBtnText}>View Certificate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* ================= MODAL 1: ASSIGN OFFICER ================= */}
        <Modal visible={!!assignModalApp} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Assign Legal Metrology Officer</Text>
              <Text style={styles.modalSubtitle}>
                Select designated verification inspector for {assignModalApp?.id}:
              </Text>

              <View style={styles.modalRadioList}>
                {OFFICERS_LIST.map((off) => (
                  <TouchableOpacity
                    key={off.id}
                    style={[
                      styles.modalRadioItem,
                      selectedOfficerId === off.id && styles.activeModalRadio,
                    ]}
                    onPress={() => setSelectedOfficerId(off.id)}
                  >
                    <Text style={styles.officerName}>{off.name}</Text>
                    <Text style={styles.officerBadge}>Badge ID: {off.badge}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setAssignModalApp(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleConfirmAssignment}
                  disabled={savingAction}
                >
                  {savingAction ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirm Assignment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL 2: SCHEDULE INSPECTION ================= */}
        <Modal visible={!!scheduleModalApp} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Schedule Statutory Inspection</Text>
              <Text style={styles.modalSubtitle}>
                Set on-site testing date & time for {scheduleModalApp?.instrumentSnapshot.makeModel}:
              </Text>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Scheduled Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Time Slot</Text>
                <TextInput
                  style={styles.modalInput}
                  value={scheduledSlot}
                  onChangeText={setScheduledSlot}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Inspection Test Protocol & Notes</Text>
                <TextInput
                  style={styles.modalInput}
                  value={inspectionNotes}
                  onChangeText={setInspectionNotes}
                />
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setScheduleModalApp(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleConfirmSchedule}
                  disabled={savingAction}
                >
                  {savingAction ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirm Schedule</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL 3: RECORD TESTING OUTCOME & ISSUE CERTIFICATE ================= */}
        <Modal visible={!!outcomeModalApp} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 540 }]}>
              <Text style={styles.modalTitle}>Record Inspection & Test Readings</Text>
              <Text style={styles.modalSubtitle}>
                Verify Maximum Permissible Error (MPE) tolerances as per Schedule IX:
              </Text>

              {/* Decision Toggle */}
              <View style={styles.decisionRow}>
                <TouchableOpacity
                  style={[styles.decisionBtn, decision === 'PASSED' && styles.passDecisionBtn]}
                  onPress={() => setDecision('PASSED')}
                >
                  <Text style={styles.decisionIcon}>✓</Text>
                  <Text
                    style={[
                      styles.decisionText,
                      decision === 'PASSED' && styles.passDecisionText,
                    ]}
                  >
                    PASSED & STAMP
                  </Text>
                  <Text style={styles.decisionSub}>Issues Official Certificate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.decisionBtn, decision === 'FAILED' && styles.failDecisionBtn]}
                  onPress={() => setDecision('FAILED')}
                >
                  <Text style={styles.decisionIcon}>✗</Text>
                  <Text
                    style={[
                      styles.decisionText,
                      decision === 'FAILED' && styles.failDecisionText,
                    ]}
                  >
                    FAIL INSPECTION
                  </Text>
                  <Text style={styles.decisionSub}>Issues Statutory Defect Notice</Text>
                </TouchableOpacity>
              </View>

              {/* Load error readings */}
              <View style={styles.readingsGrid}>
                <View style={styles.readingItem}>
                  <Text style={styles.modalLabel}>Zero Load Error</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={zeroError}
                    onChangeText={setZeroError}
                  />
                </View>
                <View style={styles.readingItem}>
                  <Text style={styles.modalLabel}>50% Capacity Error</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={halfError}
                    onChangeText={setHalfError}
                  />
                </View>
                <View style={styles.readingItem}>
                  <Text style={styles.modalLabel}>Max Capacity Error</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={maxError}
                    onChangeText={setMaxError}
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Statutory Testing Notes</Text>
                <TextInput
                  style={styles.modalInput}
                  value={testNotes}
                  onChangeText={setTestNotes}
                />
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setOutcomeModalApp(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalConfirmBtn,
                    decision === 'PASSED' ? styles.btnGreen : styles.btnRed,
                  ]}
                  onPress={handleConfirmInspectionOutcome}
                  disabled={savingAction}
                >
                  {savingAction ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>
                      {decision === 'PASSED'
                        ? 'Generate Certificate & Sign'
                        : 'Issue Defect Notice'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.xl, paddingBottom: 60, maxWidth: 1000, width: '100%', alignSelf: 'center' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  navText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
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
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E2540',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  roleBadgeText: { color: Colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  adminTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '800' },
  adminOfficer: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  adminDept: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.xl },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  metricNumber: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 2 },
  metricLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  tabsHeader: { marginBottom: Spacing.md },
  tabsHeading: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800', marginBottom: Spacing.sm },
  tabsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  activeTabBtn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  activeTabText: { color: Colors.white, fontWeight: '700' },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
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
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  appIdBadge: { color: Colors.accent, fontSize: Typography.fontSize.xs, fontFamily: 'monospace', fontWeight: '700' },
  cardBusinessTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800', marginTop: 2 },
  cardTraderSub: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pillVerified: { backgroundColor: Colors.verifiedBg, borderColor: Colors.verifiedBorder },
  pillRejected: { backgroundColor: Colors.falseBg, borderColor: Colors.falseBorder },
  pillPending: { backgroundColor: `${Colors.primary}20`, borderColor: `${Colors.primary}40` },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  textVerified: { color: Colors.verified },
  textRejected: { color: Colors.false },
  textPending: { color: Colors.primaryLight },
  specsBox: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  specsMake: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  specsDetails: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
  codeText: { color: Colors.textPrimary, fontFamily: 'monospace', fontWeight: '700' },
  specsLoc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  metaCol: { flex: 1 },
  metaColLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  metaColValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '600', marginTop: 2 },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  actionBtnIcon: { fontSize: 14 },
  assignBtn: { backgroundColor: `${Colors.accent}15`, borderWidth: 1, borderColor: `${Colors.accent}40` },
  assignBtnText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  scheduleBtn: { backgroundColor: `${Colors.primary}20`, borderWidth: 1, borderColor: `${Colors.primary}40` },
  scheduleBtnText: { color: Colors.primaryLight, fontSize: 12, fontWeight: '700' },
  outcomeBtn: { backgroundColor: `${Colors.verified}15`, borderWidth: 1, borderColor: `${Colors.verified}40` },
  outcomeBtnText: { color: Colors.verified, fontSize: 12, fontWeight: '700' },
  certBtn: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.surfaceBorder },
  certBtnText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '800' },
  modalSubtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4, marginBottom: Spacing.lg },
  modalRadioList: { gap: 8, marginBottom: Spacing.xl },
  modalRadioItem: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  activeModalRadio: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
  officerName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  officerBadge: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  modalInputGroup: { marginBottom: Spacing.md },
  modalLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', marginBottom: 4 },
  modalInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: Spacing.lg },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  modalConfirmBtn: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: BorderRadius.md },
  modalConfirmText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  decisionRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  decisionBtn: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  passDecisionBtn: { borderColor: Colors.verified, backgroundColor: `${Colors.verified}15` },
  failDecisionBtn: { borderColor: Colors.false, backgroundColor: `${Colors.false}15` },
  decisionIcon: { fontSize: 24, marginBottom: 4 },
  decisionText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  passDecisionText: { color: Colors.verified },
  failDecisionText: { color: Colors.false },
  decisionSub: { color: Colors.textMuted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  readingsGrid: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  readingItem: { flex: 1 },
  btnGreen: { backgroundColor: Colors.verified },
  btnRed: { backgroundColor: Colors.false },
});
