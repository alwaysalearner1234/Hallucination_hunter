// app/verify/index.tsx — Verify Text Screen
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { VerificationMode } from '../../types';

const DEMO_TEXT = `India became independent in 1947. India currently has 36 states. India's GDP is approximately $10 trillion, making it the second largest economy in the world. The population of India exceeded 1.5 billion in 2023, surpassing China to become the world's most populous country. India was founded by Mahatma Gandhi, who was born in 1869 in Porbandar.`;

const MODES: { key: VerificationMode; label: string; desc: string }[] = [
  { key: 'quick', label: 'Quick', desc: 'Fast' },
  { key: 'standard', label: 'Standard', desc: 'Balanced' },
  { key: 'deep', label: 'Deep', desc: 'Thorough' },
  { key: 'strict', label: 'Strict', desc: 'Rigorous' },
];

export default function VerifyScreen() {
  const { demo, sharedText } = useLocalSearchParams<{ demo?: string; sharedText?: string }>();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<VerificationMode>('standard');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (demo === '1') {
      setText(DEMO_TEXT);
    }
    if (sharedText) {
      setText(decodeURIComponent(sharedText));
    }
  }, [demo, sharedText]);

  // Handle Android share intent
  useEffect(() => {
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        const parsed = Linking.parse(url);
        if (parsed.queryParams?.text) {
          setText(String(parsed.queryParams.text));
        }
      }
    };
    handleInitialURL();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.queryParams?.text) {
        setText(String(parsed.queryParams.text));
      }
    });
    return () => subscription.remove();
  }, []);

  const handleVerify = () => {
    if (!text.trim()) {
      Alert.alert('Empty Input', 'Please paste or type an AI response to verify.');
      return;
    }
    if (text.trim().length < 20) {
      Alert.alert('Too Short', 'Please provide a longer AI response with verifiable claims.');
      return;
    }
    router.push({
      pathname: '/verify/analysis',
      params: { text: text.trim(), mode, source_type: demo === '1' ? 'demo' : 'paste' },
    });
  };

  const charCount = text.length;
  const isOverLimit = charCount > 50000;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Verify AI Response</Text>
            <Text style={styles.subtitle}>Paste the AI-generated text you want to fact-check</Text>
          </View>

          {/* Text input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Paste an AI-generated response here..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={55000}
            />
            <View style={styles.inputFooter}>
              <Text style={[styles.charCount, isOverLimit && { color: Colors.false }]}>
                {charCount.toLocaleString()} / 50,000
              </Text>
              <View style={styles.inputActions}>
                {text.length > 0 && (
                  <TouchableOpacity onPress={() => setText('')} style={styles.inputAction}>
                    <Text style={styles.inputActionText}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setText(DEMO_TEXT)}
                  style={styles.inputAction}
                >
                  <Text style={styles.inputActionText}>Example</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Mode selector */}
          <Text style={styles.modeTitle}>Verification Mode</Text>
          <View style={styles.modeRow}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeCard, mode === m.key && styles.modeCardActive]}
                onPress={() => setMode(m.key)}
              >
                <Text style={[styles.modeLabel, mode === m.key && styles.modeLabelActive]}>
                  {m.label}
                </Text>
                <Text style={styles.modeDesc}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Each factual claim will be searched against real web sources. 
              No evidence is fabricated.
            </Text>
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, (!text.trim() || isOverLimit) && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={!text.trim() || isOverLimit}
          >
            <Text style={styles.verifyBtnText}>🔍 Verify Response</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.base },
  title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontFamily: 'Inter_700Bold', marginBottom: Spacing.xs },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_400Regular' },
  inputContainer: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  input: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_400Regular',
    padding: Spacing.base,
    minHeight: 180,
    lineHeight: 22,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.sm,
  },
  charCount: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_400Regular' },
  inputActions: { flexDirection: 'row', gap: Spacing.md },
  inputAction: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  inputActionText: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  modeTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  modeRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.xl },
  modeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  modeLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_600SemiBold' },
  modeLabelActive: { color: Colors.primary },
  modeDesc: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  infoCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: `${Colors.accent}08`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: `${Colors.accent}20`,
  },
  infoIcon: { fontSize: 16 },
  infoText: { flex: 1, color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  verifyBtn: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    ...Shadows.md,
  },
  verifyBtnDisabled: { opacity: 0.45 },
  verifyBtnText: { color: Colors.white, fontSize: Typography.fontSize.md, fontFamily: 'Inter_700Bold' },
});
