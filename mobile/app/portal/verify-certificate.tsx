// app/portal/verify-certificate.tsx — Public Certificate Verification & Tamper Detection
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
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { instrumentService } from '../../services/instrumentService';
import { downloadCertificatePdf } from '../../services/certificatePdf';
import { QRCodeView } from '../../components/QRCodeView';
import { VerificationCheckResult } from '../../types/instrument';

export default function VerifyCertificateScreen() {
  const params = useLocalSearchParams();
  const initialId = (params.id as string) || 'CERT-2026-WM-4910';

  const [searchId, setSearchId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationCheckResult | null>(null);
  const [tamperSimulated, setTamperSimulated] = useState(false);

  useEffect(() => {
    if (initialId) {
      handleVerify(initialId);
    }
  }, [initialId]);

  const handleVerify = async (idToVerify?: string) => {
    const targetId = idToVerify || searchId;
    if (!targetId.trim()) return;

    setLoading(true);
    try {
      const checkResult = await instrumentService.verifyCertificateIntegrity(targetId.trim());
      setResult(checkResult);
      if (checkResult.certificate) {
        setTamperSimulated(checkResult.certificate.tamperAlert === true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTamper = async () => {
    if (!result?.certificate) return;
    setLoading(true);
    try {
      const newTamperState = !tamperSimulated;
      await instrumentService.simulateTampering(result.certificate.id, newTamperState);
      setTamperSimulated(newTamperState);
      await handleVerify(result.certificate.id);
    } finally {
      setLoading(false);
    }
  };

  const cert = result?.certificate;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.replace('/home' as never)}>
            <Text style={styles.navText}>← Main Portal Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.traderLinkBtn}
            onPress={() => router.push('/portal/auth' as never)}
          >
            <Text style={styles.traderLinkText}>Trader & Inspector Login →</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PUBLIC VERIFICATION REGISTRY</Text>
          </View>
          <Text style={styles.title}>Legal Metrology Certificate Verification</Text>
          <Text style={styles.subtitle}>
            Statutory registry to verify weighing and measuring instrument authenticity, SHA-256 integrity, and validity.
          </Text>
        </View>

        {/* Quick Sample Presets */}
        <View style={styles.presetsCard}>
          <Text style={styles.presetsTitle}>⚡ Quick Verification Samples</Text>
          <View style={styles.presetButtonsRow}>
            <TouchableOpacity
              style={[styles.presetBtn, styles.presetValid]}
              onPress={() => {
                setSearchId('CERT-2026-WM-4910');
                handleVerify('CERT-2026-WM-4910');
              }}
            >
              <Text style={styles.presetBtnTitle}>🟢 Test Valid Certificate</Text>
              <Text style={styles.presetBtnSub}>Active Stamping (Mettler Scale)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetBtn, styles.presetExpired]}
              onPress={() => {
                setSearchId('CERT-2025-WM-1102');
                handleVerify('CERT-2025-WM-1102');
              }}
            >
              <Text style={styles.presetBtnTitle}>🟡 Test Expired Certificate</Text>
              <Text style={styles.presetBtnSub}>Annual Stamping Lapsed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Enter Certificate ID or SHA-256 Hash</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. CERT-2026-WM-4910"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              value={searchId}
              onChangeText={setSearchId}
            />
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={() => handleVerify()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Verification Result Section */}
        {result && (
          <View style={styles.resultContainer}>
            {/* Status Banner */}
            <View
              style={[
                styles.statusBanner,
                result.status === 'VALID'
                  ? styles.statusValidBanner
                  : result.status === 'EXPIRED'
                  ? styles.statusExpiredBanner
                  : styles.statusInvalidBanner,
              ]}
            >
              <Text style={styles.statusBannerIcon}>
                {result.status === 'VALID'
                  ? '🛡️'
                  : result.status === 'EXPIRED'
                  ? '⚠️'
                  : '🚨'}
              </Text>
              <View style={styles.statusBannerContent}>
                <Text
                  style={[
                    styles.statusBannerHeading,
                    result.status === 'VALID'
                      ? styles.textGreen
                      : result.status === 'EXPIRED'
                      ? styles.textAmber
                      : styles.textRed,
                  ]}
                >
                  CERTIFICATE STATUS: {result.status}
                </Text>
                <Text style={styles.statusBannerMsg}>{result.statusMessage}</Text>
              </View>
            </View>

            {/* Tampering Simulator Banner for reviewers */}
            {cert && (
              <View style={styles.tamperBox}>
                <View style={styles.tamperHeader}>
                  <Text style={styles.tamperTitle}>🧪 Tampering Detection Interactive Test</Text>
                  <TouchableOpacity
                    style={[
                      styles.tamperToggleBtn,
                      tamperSimulated ? styles.tamperActiveBtn : styles.tamperInactiveBtn,
                    ]}
                    onPress={handleToggleTamper}
                  >
                    <Text style={styles.tamperToggleText}>
                      {tamperSimulated ? '✓ Tampering Active (Click to Restore)' : '⚡ Simulate Tampered Serial'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.tamperDesc}>
                  Simulate modifying instrument specs without updating the cryptographic signature. The verification engine immediately flags a SHA-256 hash mismatch!
                </Text>
              </View>
            )}

            {/* Certificate Details Card */}
            {cert && (
              <View style={styles.certCard}>
                <View style={styles.certCardHeader}>
                  <View>
                    <Text style={styles.certCardId}>{cert.id}</Text>
                    <Text style={styles.certCardSub}>
                      Directorate of Legal Metrology · Official Verification Seal
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.downloadPdfBtn}
                    onPress={() => downloadCertificatePdf(cert)}
                  >
                    <Text style={styles.downloadPdfText}>📥 Download PDF</Text>
                  </TouchableOpacity>
                </View>

                {/* QR Code and Specs Grid */}
                <View style={styles.certBodyRow}>
                  {/* QR Code */}
                  <View style={styles.qrColumn}>
                    <QRCodeView
                      value={cert.verificationUrl}
                      size={140}
                      showLinkButton={false}
                    />
                    <Text style={styles.qrCaption}>Scan to verify statutory authenticity</Text>
                  </View>

                  {/* Specifications */}
                  <View style={styles.specsColumn}>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Instrument Type:</Text>
                      <Text style={styles.specVal}>{cert.instrumentCategory}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Make & Model:</Text>
                      <Text style={styles.specVal}>{cert.makeModel}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Serial Number:</Text>
                      <Text style={[styles.specVal, styles.monoVal]}>{cert.serialNumber}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Accuracy Class:</Text>
                      <Text style={styles.specVal}>{cert.accuracyClass}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Capacity / Interval:</Text>
                      <Text style={styles.specVal}>
                        {cert.capacity} ({cert.verificationInterval})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Trader & Stamping Details */}
                <View style={styles.detailsGrid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Registered Business</Text>
                    <Text style={styles.gridVal}>{cert.businessName}</Text>
                    <Text style={styles.gridSub}>{cert.traderName}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Premises Location</Text>
                    <Text style={styles.gridVal}>{cert.premisesLocation}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Verification Date</Text>
                    <Text style={styles.gridVal}>{cert.issueDate}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>Valid Until (Expiry)</Text>
                    <Text
                      style={[
                        styles.gridVal,
                        result.status === 'EXPIRED' ? styles.textAmber : styles.textGreen,
                      ]}
                    >
                      {cert.expiryDate}
                    </Text>
                  </View>
                  <View style={[styles.gridItem, { width: '100%' }]}>
                    <Text style={styles.gridLabel}>Authorized Legal Metrology Officer</Text>
                    <Text style={styles.gridVal}>
                      {cert.verificationOfficer} (Badge #{cert.officerBadge})
                    </Text>
                    <Text style={styles.gridSub}>{cert.division}</Text>
                  </View>
                </View>

                {/* Cryptographic SHA-256 Audit Bar */}
                <View style={styles.cryptoBox}>
                  <Text style={styles.cryptoTitle}>
                    🔐 SHA-256 Cryptographic Tamper-Proof Audit
                  </Text>
                  <View style={styles.hashRow}>
                    <Text style={styles.hashLabel}>Computed SHA-256 Digest:</Text>
                    <Text style={styles.hashVal}>{result.computedHash}</Text>
                  </View>
                  <View style={styles.hashRow}>
                    <Text style={styles.hashLabel}>Expected Digital Signature:</Text>
                    <Text style={styles.hashVal}>{result.expectedHash}</Text>
                  </View>
                  <View style={styles.integrityStatusRow}>
                    <Text style={styles.integrityText}>
                      Hash Match Integrity:{' '}
                      <Text
                        style={{
                          color: result.isTampered ? Colors.false : Colors.verified,
                          fontWeight: '800',
                        }}
                      >
                        {result.isTampered ? 'MISMATCH (TAMPERING DETECTED)' : 'AUTHENTIC & VERIFIED'}
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.xl, paddingBottom: 60, maxWidth: 860, width: '100%', alignSelf: 'center' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  navText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  traderLinkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  traderLinkText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  header: { marginBottom: Spacing.lg },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E2540',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  badgeText: { color: Colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
  presetsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
  },
  presetsTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  presetButtonsRow: { flexDirection: 'row', gap: 10 },
  presetBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  presetValid: { backgroundColor: 'rgba(0, 229, 160, 0.1)', borderColor: 'rgba(0, 229, 160, 0.3)' },
  presetExpired: { backgroundColor: 'rgba(255, 165, 2, 0.1)', borderColor: 'rgba(255, 165, 2, 0.3)' },
  presetBtnTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  presetBtnSub: { color: Colors.textSecondary, fontSize: 10, marginTop: 2 },
  searchCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  searchLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  verifyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  resultContainer: { marginTop: Spacing.sm },
  statusBanner: {
    flexDirection: 'row',
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: 12,
    alignItems: 'center',
  },
  statusValidBanner: { backgroundColor: 'rgba(0, 229, 160, 0.12)', borderColor: Colors.verifiedBorder },
  statusExpiredBanner: { backgroundColor: 'rgba(255, 165, 2, 0.12)', borderColor: Colors.unverifiableBorder },
  statusInvalidBanner: { backgroundColor: 'rgba(255, 71, 87, 0.15)', borderColor: Colors.falseBorder },
  statusBannerIcon: { fontSize: 32 },
  statusBannerContent: { flex: 1 },
  statusBannerHeading: { fontSize: Typography.fontSize.base, fontWeight: '900', letterSpacing: 0.5 },
  statusBannerMsg: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, marginTop: 2, lineHeight: 18 },
  textGreen: { color: Colors.verified },
  textAmber: { color: Colors.unverifiable },
  textRed: { color: Colors.false },
  tamperBox: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
  },
  tamperHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tamperTitle: { color: Colors.accent, fontSize: Typography.fontSize.xs, fontWeight: '800' },
  tamperToggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: BorderRadius.sm },
  tamperActiveBtn: { backgroundColor: Colors.false },
  tamperInactiveBtn: { backgroundColor: Colors.primary },
  tamperToggleText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  tamperDesc: { color: Colors.textSecondary, fontSize: 11, marginTop: 6, lineHeight: 16 },
  certCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.md,
  },
  certCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  certCardId: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '800', fontFamily: 'monospace' },
  certCardSub: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
  downloadPdfBtn: {
    backgroundColor: Colors.verified,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
  },
  downloadPdfText: { color: '#0A0A0F', fontSize: 12, fontWeight: '800' },
  certBodyRow: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  qrColumn: { alignItems: 'center' },
  qrCaption: { color: Colors.textMuted, fontSize: 9, marginTop: 6, textAlign: 'center', maxWidth: 140 },
  specsColumn: { flex: 1, gap: 6 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between' },
  specLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontWeight: '600' },
  specVal: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  monoVal: { fontFamily: 'monospace' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: Spacing.lg },
  gridItem: { width: '47%' },
  gridLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  gridVal: { color: Colors.textPrimary, fontSize: Typography.fontSize.xs, fontWeight: '600', marginTop: 2 },
  gridSub: { color: Colors.textSecondary, fontSize: 10, marginTop: 1 },
  cryptoBox: {
    backgroundColor: '#0E0E17',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#232338',
  },
  cryptoTitle: { color: Colors.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  hashRow: { marginBottom: 4 },
  hashLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '600' },
  hashVal: { color: Colors.textPrimary, fontSize: 9, fontFamily: 'monospace' },
  integrityStatusRow: { marginTop: 6, borderTopWidth: 1, borderTopColor: '#232338', paddingTop: 6 },
  integrityText: { color: Colors.textSecondary, fontSize: 10 },
});
