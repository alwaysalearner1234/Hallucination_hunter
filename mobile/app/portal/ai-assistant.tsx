// app/portal/ai-assistant.tsx — Legal Metrology Regulatory AI Assistant (RAG)
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
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { ragAssistantService } from '../../services/ragAssistantService';
import { RagResponse } from '../../types/instrument';

const PRESET_QUESTIONS = [
  'What are the Maximum Permissible Errors (MPE) for Class III weighing instruments?',
  'How often must commercial counter scales undergo statutory re-verification?',
  'What are the penalties under Section 30 and 33 for using unverified weights?',
  'What happens if an instrument verification seal is broken or tampered with?',
  'Can this AI assistant approve my inspection application or issue a certificate?',
];

export default function AiAssistantScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RagResponse[]>([]);

  const handleAsk = async (questionToAsk?: string) => {
    const q = questionToAsk || query;
    if (!q.trim()) return;

    setLoading(true);
    try {
      const response = await ragAssistantService.askQuestion(q);
      setHistory((prev) => [response, ...prev]);
      setQuery('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.replace('/home' as never)}>
            <Text style={styles.navText}>← Main Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.traderLinkBtn}
            onPress={() => router.push('/portal/trader' as never)}
          >
            <Text style={styles.traderLinkText}>Trader Dashboard →</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>REGULATORY RAG ASSISTANT</Text>
          </View>
          <Text style={styles.title}>Legal Metrology AI Assistant</Text>
          <Text style={styles.subtitle}>
            Ask questions regarding weighing and measuring instrument verification, tolerances, and compliance standards.
          </Text>
        </View>

        {/* Statutory Disclaimer Box */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerIcon}>⚖️</Text>
          <Text style={styles.disclaimerText}>
            <Text style={{ fontWeight: '800' }}>Official Notice:</Text> Answers are synthesized strictly from approved Legal Metrology Act & Rules documents with source citations. Statutory determinations and stamping authority remain exclusively with designated Legal Metrology Officers.
          </Text>
        </View>

        {/* Query Input Card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Ask a Compliance or Verification Question</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. What is the MPE tolerance for grocery scales?"
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleAsk()}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => handleAsk()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.sendBtnText}>Ask →</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <Text style={styles.presetHeading}>Frequently Asked Statutory Questions:</Text>
          <View style={styles.presetsList}>
            {PRESET_QUESTIONS.map((pq, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.presetPill}
                onPress={() => {
                  setQuery(pq);
                  handleAsk(pq);
                }}
              >
                <Text style={styles.presetPillText}>{pq}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Conversation Stream */}
        <View style={styles.historyContainer}>
          {history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🤖</Text>
              <Text style={styles.emptyTitle}>Ready for your questions</Text>
              <Text style={styles.emptyDesc}>
                Click any of the suggested regulatory questions above or type your own question to inspect citations from the Legal Metrology Act and OIML recommendations.
              </Text>
            </View>
          ) : (
            history.map((item, idx) => (
              <View key={idx} style={styles.qaCard}>
                {/* Question */}
                <View style={styles.questionRow}>
                  <Text style={styles.qIcon}>👤</Text>
                  <Text style={styles.qText}>{item.question}</Text>
                </View>

                {/* Answer */}
                <View style={styles.answerContainer}>
                  <View style={styles.answerHeader}>
                    <Text style={styles.aiBadge}>AI REGULATORY RESPONSE</Text>
                    {item.confidence > 0 && (
                      <Text style={styles.confidenceScore}>
                        Document Relevance: {item.confidence}%
                      </Text>
                    )}
                  </View>

                  <Text style={styles.answerText}>{item.answer}</Text>

                  {/* Document Citations */}
                  {item.citations.length > 0 && (
                    <View style={styles.citationsBox}>
                      <Text style={styles.citationsTitle}>📚 Verified Source Citations:</Text>
                      {item.citations.map((cite, cIdx) => (
                        <View key={cIdx} style={styles.citationItem}>
                          <Text style={styles.citationDoc}>
                            [{cite.docId}] {cite.title}
                          </Text>
                          <Text style={styles.citationSection}>{cite.section}</Text>
                          <Text style={styles.citationSnippet}>"{cite.snippet}"</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Per-response disclaimer */}
                  <Text style={styles.responseDisclaimer}>ℹ️ {item.disclaimer}</Text>
                </View>
              </View>
            ))
          )}
        </View>
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
  header: { marginBottom: Spacing.md },
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
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 165, 2, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 2, 0.25)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    gap: 10,
    alignItems: 'center',
  },
  disclaimerIcon: { fontSize: 22 },
  disclaimerText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18, flex: 1 },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: { color: Colors.white, fontSize: Typography.fontSize.sm, fontWeight: '800' },
  presetHeading: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  presetsList: { gap: 6 },
  presetPill: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  presetPillText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 16 },
  historyContainer: { gap: 16 },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyIcon: { fontSize: 44, marginBottom: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
  emptyDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, textAlign: 'center', marginTop: 4, maxWidth: 420 },
  qaCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  questionRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: Spacing.md },
  qIcon: { fontSize: 18 },
  qText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700', flex: 1 },
  answerContainer: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  answerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  aiBadge: { color: Colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  confidenceScore: { color: Colors.verified, fontSize: 10, fontWeight: '700' },
  answerText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, lineHeight: 22 },
  citationsBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  citationsTitle: { color: Colors.primaryLight, fontSize: 11, fontWeight: '800', marginBottom: 6 },
  citationItem: {
    backgroundColor: '#0D0E17',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  citationDoc: { color: Colors.textPrimary, fontSize: 11, fontWeight: '700' },
  citationSection: { color: Colors.accent, fontSize: 10, fontWeight: '600', marginTop: 1 },
  citationSnippet: { color: Colors.textSecondary, fontSize: 10, fontStyle: 'italic', marginTop: 2 },
  responseDisclaimer: { color: Colors.textMuted, fontSize: 10, marginTop: Spacing.sm, fontStyle: 'italic' },
});
