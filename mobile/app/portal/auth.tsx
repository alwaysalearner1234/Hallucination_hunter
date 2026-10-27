// app/portal/auth.tsx — Login & Registration for Traders, Inspectors, and Admins
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { instrumentService, DEMO_USERS } from '../../services/instrumentService';
import { UserRole } from '../../types/instrument';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('trader');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickDemo = async (demoRole: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      const user = await instrumentService.switchRole(demoRole);
      if (demoRole === 'trader') {
        router.replace('/portal/trader' as never);
      } else {
        router.replace('/portal/admin' as never);
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await instrumentService.login(email, role);
      } else {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        await instrumentService.registerTrader({
          name,
          email,
          businessName,
          tradeLicenseNumber: tradeLicense,
          address,
          phone,
        });
      }

      if (role === 'trader') {
        router.replace('/portal/trader' as never);
      } else {
        router.replace('/portal/admin' as never);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Navigation back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/home' as never)}>
          <Text style={styles.backBtnText}>← Back to Home</Text>
        </TouchableOpacity>

        {/* Portal Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>GOVERNMENT PORTAL</Text>
          </View>
          <Text style={styles.portalTitle}>Legal Metrology</Text>
          <Text style={styles.portalSubtitle}>
            Online Verification System for Weighing & Measuring Instruments
          </Text>
        </View>

        {/* Quick Demo Logins Bar */}
        <View style={styles.quickCard}>
          <Text style={styles.quickCardTitle}>⚡ 1-Click Demo Profiles</Text>
          <Text style={styles.quickCardDesc}>
            Instantly evaluate the portal with pre-configured mock data for any role:
          </Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={[styles.demoBtn, styles.demoTrader]}
              onPress={() => handleQuickDemo('trader')}
            >
              <Text style={styles.demoBtnIcon}>🏪</Text>
              <Text style={styles.demoBtnText}>Trader</Text>
              <Text style={styles.demoBtnSub}>Apex Retail</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBtn, styles.demoInspector]}
              onPress={() => handleQuickDemo('inspector')}
            >
              <Text style={styles.demoBtnIcon}>🔍</Text>
              <Text style={styles.demoBtnText}>Inspector</Text>
              <Text style={styles.demoBtnSub}>Badge #408</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBtn, styles.demoAdmin]}
              onPress={() => handleQuickDemo('admin')}
            >
              <Text style={styles.demoBtnIcon}>🏛️</Text>
              <Text style={styles.demoBtnText}>Admin</Text>
              <Text style={styles.demoBtnSub}>Directorate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Mode Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabBtn, mode === 'login' && styles.activeTab]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, mode === 'register' && styles.activeTab]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>
                New Trader Registration
              </Text>
            </TouchableOpacity>
          </View>

          {/* Role selector for login */}
          {mode === 'login' && (
            <View style={styles.roleContainer}>
              <Text style={styles.label}>Select Role</Text>
              <View style={styles.roleGrid}>
                {(['trader', 'inspector', 'admin'] as UserRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, role === r && styles.activeRoleOption]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={styles.roleOptionIcon}>
                      {r === 'trader' ? '🏪' : r === 'inspector' ? '🔍' : '🏛️'}
                    </Text>
                    <Text style={[styles.roleOptionText, role === r && styles.activeRoleText]}>
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Registration fields */}
          {mode === 'register' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Proprietor / Trader Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rajesh Kumar"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business / Trade Entity Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Apex Supermarket Pvt Ltd"
                  placeholderTextColor={Colors.textMuted}
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Trade License Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. TL-2024-DEL-89412"
                  placeholderTextColor={Colors.textMuted}
                  value={tradeLicense}
                  onChangeText={setTradeLicense}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Premises Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Shop number, Commercial Street, City"
                  placeholderTextColor={Colors.textMuted}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Phone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 98000 00000"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </>
          )}

          {/* Email & Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder={role === 'trader' ? 'trader@business.com' : 'officer@legalmetrology.gov.in'}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
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
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? `Sign In as ${role.toUpperCase()}` : 'Complete Registration'} →
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Public Certificate verification direct link */}
        <TouchableOpacity
          style={styles.publicVerifyLink}
          onPress={() => router.push('/portal/verify-certificate' as never)}
        >
          <Text style={styles.publicVerifyText}>
            🔍 Looking to verify an instrument certificate? <Text style={styles.publicVerifyAccent}>Click for Public QR Verification</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.xl,
    paddingBottom: 60,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    marginBottom: Spacing.lg,
    paddingVertical: 6,
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E2540',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#303D66',
  },
  badgeText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  portalTitle: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  portalSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    marginTop: 6,
    lineHeight: 22,
  },
  quickCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  quickCardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    marginBottom: 4,
  },
  quickCardDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.md,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  demoTrader: {
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    borderColor: 'rgba(108, 99, 255, 0.4)',
  },
  demoInspector: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderColor: 'rgba(0, 212, 255, 0.4)',
  },
  demoAdmin: {
    backgroundColor: 'rgba(0, 229, 160, 0.12)',
    borderColor: 'rgba(0, 229, 160, 0.4)',
  },
  demoBtnIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  demoBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  demoBtnSub: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.md,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.white,
    fontWeight: '700',
  },
  roleContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  activeRoleOption: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}25`,
  },
  roleOptionIcon: {
    fontSize: 14,
  },
  roleOptionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  activeRoleText: {
    color: Colors.textPrimary,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
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
  errorBox: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderWidth: 1,
    borderColor: Colors.falseBorder,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  errorText: {
    color: Colors.false,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  publicVerifyLink: {
    marginTop: Spacing.xl,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.accent}10`,
    borderWidth: 1,
    borderColor: `${Colors.accent}30`,
    alignItems: 'center',
  },
  publicVerifyText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  publicVerifyAccent: {
    color: Colors.accent,
    fontWeight: '700',
  },
});
