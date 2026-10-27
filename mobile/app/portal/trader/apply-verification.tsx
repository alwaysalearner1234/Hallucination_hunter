// app/portal/trader/apply-verification.tsx — Apply for Verification and Stamping
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { instrumentService } from '../../../services/instrumentService';
import { Instrument, ApplicationType } from '../../../types/instrument';

const APPLICATION_TYPES: { key: ApplicationType; label: string; desc: string }[] = [
  {
    key: 'periodic',
    label: 'Periodic Annual Re-verification',
    desc: 'Statutory annual re-verification and re-stamping as per Section 24.',
  },
  {
    key: 'initial',
    label: 'Initial Verification & Stamping',
    desc: 'First-time verification for newly purchased or imported instruments before trade use.',
  },
  {
    key: 'post_repair',
    label: 'Verification After Repair / Broken Seal',
    desc: 'Mandatory statutory re-stamping following mechanical repair or broken lead seal.',
  },
];

export default function ApplyVerificationScreen() {
  const params = useLocalSearchParams();
  const preselectedInstrumentId = params.instrumentId as string | undefined;

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>(
    preselectedInstrumentId || ''
  );
  const [applicationType, setApplicationType] = useState<ApplicationType>('periodic');
  const [preferredDate, setPreferredDate] = useState('2026-11-15');
  const [locationType, setLocationType] = useState<'on_site' | 'laboratory'>('on_site');
  const [remarks, setRemarks] = useState('Instrument clean and ready with standard test weights.');
  const [documentName, setDocumentName] = useState('Purchase_Invoice_and_Warranty.pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAppId, setSuccessAppId] = useState<string | null>(null);

  useEffect(() => {
    loadInstruments();
  }, []);

  const loadInstruments = async () => {
    const user = await instrumentService.getCurrentUser();
    const list = await instrumentService.listInstruments(user.id);
    setInstruments(list);
    if (!selectedInstrumentId && list.length > 0) {
      setSelectedInstrumentId(list[0].id);
    }
  };

  const selectedInstrument = instruments.find((i) => i.id === selectedInstrumentId);

  const handleSubmit = async () => {
    setError(null);
    if (!selectedInstrument) {
      setError('Please select an instrument to verify.');
      return;
    }
    if (!preferredDate.trim()) {
      setError('Please provide a preferred inspection date.');
      return;
    }

    setLoading(true);
    try {
      const user = await instrumentService.getCurrentUser();
      const newApp = await instrumentService.submitApplication({
        trader: user,
        instrument: selectedInstrument,
        applicationType,
        preferredDate,
        locationType,
        remarks,
        documentName,
      });

      setSuccessAppId(newApp.id);
      setTimeout(() => {
        router.replace('/portal/trader/applications' as never);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Navigation */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back to Trader Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Apply for Verification</Text>
          <Text style={styles.subtitle}>
            Submit statutory application for physical inspection and stamping under Legal Metrology Act.
          </Text>
        </View>

        {successAppId && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>✓ Application Submitted Successfully!</Text>
            <Text style={styles.successSub}>
              Application ID: <Text style={styles.codeText}>{successAppId}</Text>
            </Text>
            <Text style={styles.successRedirect}>Redirecting to application tracking...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Step 1: Instrument Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.stepTitle}>1. Select Registered Instrument</Text>
          {instruments.length === 0 ? (
            <View style={styles.noInstBox}>
              <Text style={styles.noInstText}>No registered instruments found.</Text>
              <TouchableOpacity
                style={styles.regInstBtn}
                onPress={() => router.push('/portal/trader/register-instrument' as never)}
              >
                <Text style={styles.regInstBtnText}>+ Register Instrument First</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.instrumentList}>
              {instruments.map((inst) => {
                const isSelected = inst.id === selectedInstrumentId;
                return (
                  <TouchableOpacity
                    key={inst.id}
                    style={[styles.instSelectCard, isSelected && styles.activeInstSelectCard]}
                    onPress={() => setSelectedInstrumentId(inst.id)}
                  >
                    <View style={styles.instSelectHeader}>
                      <Text style={styles.instSelectMake}>{inst.makeModel}</Text>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.activeRadioCircle,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </View>
                    <Text style={styles.instSelectSub}>
                      Serial: {inst.serialNumber} · {inst.capacity} · {inst.accuracyClass}
                    </Text>
                    <Text style={styles.instSelectLoc}>📍 {inst.premisesLocation}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Step 2: Application Type */}
        <View style={styles.sectionCard}>
          <Text style={styles.stepTitle}>2. Verification Purpose & Category</Text>
          <View style={styles.typeList}>
            {APPLICATION_TYPES.map((type) => {
              const isSelected = applicationType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeCard, isSelected && styles.activeTypeCard]}
                  onPress={() => setApplicationType(type.key)}
                >
                  <View style={styles.typeHeader}>
                    <Text style={[styles.typeLabel, isSelected && styles.activeTypeLabel]}>
                      {type.label}
                    </Text>
                    <View style={[styles.radioCircle, isSelected && styles.activeRadioCircle]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <Text style={styles.typeDesc}>{type.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Inspection Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.stepTitle}>3. Inspection Preferences</Text>

          {/* Location Choice */}
          <Text style={styles.label}>Inspection Location</Text>
          <View style={styles.locationRow}>
            <TouchableOpacity
              style={[
                styles.locBtn,
                locationType === 'on_site' && styles.activeLocBtn,
              ]}
              onPress={() => setLocationType('on_site')}
            >
              <Text style={styles.locIcon}>🏢</Text>
              <Text style={[styles.locTitle, locationType === 'on_site' && styles.activeLocTitle]}>
                On-Site Inspection
              </Text>
              <Text style={styles.locSub}>Officer visits trader premises</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.locBtn,
                locationType === 'laboratory' && styles.activeLocBtn,
              ]}
              onPress={() => setLocationType('laboratory')}
            >
              <Text style={styles.locIcon}>🔬</Text>
              <Text
                style={[styles.locTitle, locationType === 'laboratory' && styles.activeLocTitle]}
              >
                Departmental Lab
              </Text>
              <Text style={styles.locSub}>Deliver to standards lab</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Inspection Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={preferredDate}
              onChangeText={setPreferredDate}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calibration / Purchase Document Attachment</Text>
            <TextInput
              style={styles.input}
              placeholder="Document file name or reference"
              placeholderTextColor={Colors.textMuted}
              value={documentName}
              onChangeText={setDocumentName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Remarks / Instructions for Inspector</Text>
            <TextInput
              style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
              multiline
              placeholder="e.g. Standard test weights available, gate clearance instructions..."
              placeholderTextColor={Colors.textMuted}
              value={remarks}
              onChangeText={setRemarks}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading || instruments.length === 0}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Statutory Application →</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.xl, paddingBottom: 60, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtn: { marginBottom: Spacing.base },
  backBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  header: { marginBottom: Spacing.xl },
  title: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  successBox: {
    backgroundColor: Colors.verifiedBg,
    borderColor: Colors.verifiedBorder,
    borderWidth: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  successTitle: { color: Colors.verified, fontSize: Typography.fontSize.base, fontWeight: '800' },
  successSub: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  codeText: { fontFamily: 'monospace', fontWeight: '700' },
  successRedirect: { color: Colors.textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  errorBox: {
    backgroundColor: Colors.falseBg,
    borderColor: Colors.falseBorder,
    borderWidth: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: { color: Colors.false, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  stepTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800', marginBottom: Spacing.md },
  noInstBox: { padding: Spacing.lg, alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md },
  noInstText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  regInstBtn: { marginTop: Spacing.sm, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.sm },
  regInstBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  instrumentList: { gap: 10 },
  instSelectCard: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  activeInstSelectCard: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}20`,
  },
  instSelectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  instSelectMake: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRadioCircle: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  instSelectSub: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4 },
  instSelectLoc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  typeList: { gap: 10 },
  typeCard: {
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  activeTypeCard: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
  typeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  activeTypeLabel: { color: Colors.white },
  typeDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 4, lineHeight: 18 },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.base },
  locBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  activeLocBtn: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
  locIcon: { fontSize: 24, marginBottom: 4 },
  locTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  activeLocTitle: { color: Colors.textPrimary },
  locSub: { color: Colors.textMuted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  inputGroup: { marginBottom: Spacing.base },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  submitBtnText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
});
