// app/portal/trader/register-instrument.tsx — Instrument Registration Form
import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { instrumentService } from '../../../services/instrumentService';
import { InstrumentCategory, AccuracyClass } from '../../../types/instrument';

const CATEGORIES: { key: InstrumentCategory; label: string; icon: string; defaultClass: AccuracyClass }[] = [
  { key: 'electronic_scale', label: 'Electronic Counter Scale', icon: '⚖️', defaultClass: 'Class III' },
  { key: 'platform_scale', label: 'Platform / Bench Scale', icon: '📦', defaultClass: 'Class III' },
  { key: 'weighbridge', label: 'Heavy Duty Weighbridge', icon: '🚛', defaultClass: 'Class IV' },
  { key: 'fuel_dispenser', label: 'Fuel Dispensing Unit', icon: '⛽', defaultClass: 'Class II' },
  { key: 'flow_meter', label: 'Liquid Measure / Flow Meter', icon: '💧', defaultClass: 'Class II' },
  { key: 'test_weights', label: 'Standard Calibrated Weights', icon: '🪙', defaultClass: 'Class I' },
];

const ACCURACY_CLASSES: AccuracyClass[] = ['Class I', 'Class II', 'Class III', 'Class IV'];

export default function RegisterInstrumentScreen() {
  const [category, setCategory] = useState<InstrumentCategory>('electronic_scale');
  const [makeModel, setMakeModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [capacity, setCapacity] = useState('30 kg (Min: 100 g)');
  const [interval, setInterval] = useState('e = 5 g, d = 1 g');
  const [accuracyClass, setAccuracyClass] = useState<AccuracyClass>('Class III');
  const [premisesLocation, setPremisesLocation] = useState('Counter #1, Main Sales Floor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedCategoryObj = CATEGORIES.find((c) => c.key === category)!;

  const handleCategorySelect = (item: typeof CATEGORIES[0]) => {
    setCategory(item.key);
    setAccuracyClass(item.defaultClass);
    if (item.key === 'electronic_scale') {
      setCapacity('30 kg (Min: 100 g)');
      setInterval('e = 5 g, d = 1 g');
    } else if (item.key === 'weighbridge') {
      setCapacity('50 Ton (Min: 200 kg)');
      setInterval('e = 20 kg');
    } else if (item.key === 'fuel_dispenser') {
      setCapacity('50 Liters/min');
      setInterval('e = 0.05 L');
    }
  };

  const handleQuickFill = () => {
    setMakeModel('Avery Weigh-Tronix ZM305');
    setSerialNumber(`AW-${Date.now().toString().slice(-4)}`);
    setPremisesLocation('Main Dispatch Platform Bay 1');
  };

  const handleSubmit = async () => {
    setError(null);
    if (!makeModel.trim()) {
      setError('Please enter the manufacturer make and model name.');
      return;
    }
    if (!serialNumber.trim()) {
      setError('Please enter the instrument serial number.');
      return;
    }
    if (!capacity.trim()) {
      setError('Please specify the measuring capacity.');
      return;
    }
    if (!premisesLocation.trim()) {
      setError('Please specify the premises location where the instrument is installed.');
      return;
    }

    setLoading(true);
    try {
      const currentUser = await instrumentService.getCurrentUser();
      const newInst = await instrumentService.registerInstrument({
        traderId: currentUser.id,
        traderName: currentUser.name,
        businessName: currentUser.businessName || 'Business Owner',
        category,
        categoryLabel: selectedCategoryObj.label,
        makeModel: makeModel.trim(),
        serialNumber: serialNumber.trim().toUpperCase(),
        capacity: capacity.trim(),
        verificationInterval: interval.trim(),
        accuracyClass,
        premisesLocation: premisesLocation.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        router.replace('/portal/trader' as never);
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to register instrument.');
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
          <Text style={styles.title}>Register Instrument</Text>
          <Text style={styles.subtitle}>
            Register a weighing or measuring instrument in the statutory Legal Metrology registry.
          </Text>
          <TouchableOpacity style={styles.quickFillBtn} onPress={handleQuickFill}>
            <Text style={styles.quickFillText}>⚡ Quick Fill Sample Specs</Text>
          </TouchableOpacity>
        </View>

        {success && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              ✓ Instrument successfully registered! Redirecting to dashboard...
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>1. Instrument Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryCard, category === cat.key && styles.activeCategoryCard]}
                onPress={() => handleCategorySelect(cat)}
              >
                <Text style={styles.categoryCardIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryCardLabel,
                    category === cat.key && styles.activeCategoryLabel,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Specifications Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>2. Instrument Technical Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Manufacturer Make & Model *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mettler Toledo BBA231 or Essae DS-215"
              placeholderTextColor={Colors.textMuted}
              value={makeModel}
              onChangeText={setMakeModel}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Unique Serial Number *</Text>
            <TextInput
              style={[styles.input, { fontFamily: 'monospace' }]}
              placeholder="e.g. MT-2024-8849"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              value={serialNumber}
              onChangeText={setSerialNumber}
            />
          </View>

          {/* Accuracy Class Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Statutory Accuracy Class (Schedule IX) *</Text>
            <View style={styles.classRow}>
              {ACCURACY_CLASSES.map((cls) => (
                <TouchableOpacity
                  key={cls}
                  style={[styles.classBtn, accuracyClass === cls && styles.activeClassBtn]}
                  onPress={() => setAccuracyClass(cls)}
                >
                  <Text style={[styles.classBtnText, accuracyClass === cls && styles.activeClassBtnText]}>
                    {cls}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.rowTwoCols}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Capacity Range *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 30 kg (Min: 100 g)"
                placeholderTextColor={Colors.textMuted}
                value={capacity}
                onChangeText={setCapacity}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Scale Interval (e / d) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. e = 5 g, d = 1 g"
                placeholderTextColor={Colors.textMuted}
                value={interval}
                onChangeText={setInterval}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Premises / Installation Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Billing Counter #1, Main Sales Floor"
              placeholderTextColor={Colors.textMuted}
              value={premisesLocation}
              onChangeText={setPremisesLocation}
            />
          </View>

          {/* Live Preview Card */}
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Statutory Registration Tag Preview</Text>
            <View style={styles.previewContent}>
              <Text style={styles.previewCategory}>
                {selectedCategoryObj.icon} {selectedCategoryObj.label}
              </Text>
              <Text style={styles.previewMake}>
                {makeModel.trim() || 'Make & Model Name'}
              </Text>
              <Text style={styles.previewSub}>
                S/N: {serialNumber.trim() || 'PENDING-SERIAL'} · {accuracyClass}
              </Text>
              <Text style={styles.previewLoc}>
                📍 {premisesLocation.trim() || 'Premises Location'}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Confirm & Register Instrument →</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.xl, paddingBottom: 60, maxWidth: 760, width: '100%', alignSelf: 'center' },
  backBtn: { marginBottom: Spacing.base },
  backBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  header: { marginBottom: Spacing.lg },
  title: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  quickFillBtn: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    backgroundColor: `${Colors.accent}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
  },
  quickFillText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  successBox: {
    backgroundColor: Colors.verifiedBg,
    borderColor: Colors.verifiedBorder,
    borderWidth: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  successText: { color: Colors.verified, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  errorBox: {
    backgroundColor: Colors.falseBg,
    borderColor: Colors.falseBorder,
    borderWidth: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: { color: Colors.false, fontSize: Typography.fontSize.sm, fontWeight: '700' },
  section: { marginBottom: Spacing.lg },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    gap: 6,
  },
  activeCategoryCard: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}20`,
  },
  categoryCardIcon: { fontSize: 24 },
  categoryCardLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700', textAlign: 'center' },
  activeCategoryLabel: { color: Colors.textPrimary },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.md,
  },
  sectionHeader: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '800', marginBottom: Spacing.base },
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
  classRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  classBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  activeClassBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  classBtnText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  activeClassBtnText: { color: Colors.white },
  rowTwoCols: { flexDirection: 'row', gap: 12 },
  previewBox: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  previewTitle: { color: Colors.accent, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  previewContent: {},
  previewCategory: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  previewMake: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '800', marginTop: 2 },
  previewSub: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontFamily: 'monospace', marginTop: 2 },
  previewLoc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 4 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.sm,
  },
  submitBtnText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: '800' },
});
