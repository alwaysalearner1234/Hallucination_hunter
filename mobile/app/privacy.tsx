// app/privacy.tsx — Privacy & Data Screen
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '../services/storage';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

export default function PrivacyScreen() {
  const [saveHistory, setSaveHistory] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all your local verification history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await storage.clearHistory();
            Alert.alert('Done', 'All history has been deleted.');
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all history, settings, and reset the app. You will see onboarding again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await storage.clearAll();
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const handleSaveHistoryChange = async (val: boolean) => {
    setSaveHistory(val);
    await storage.saveSettings({ saveHistory: val });
  };

  const handlePrivacyModeChange = async (val: boolean) => {
    setPrivacyMode(val);
    await storage.saveSettings({ privacyMode: val });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Hallucination Hunter is designed with privacy in mind. Here's exactly what happens with your data.
        </Text>

        <Section title="📤 What is sent to our servers">
          <InfoItem icon="📝" text="The AI-generated text you submit for verification" />
          <InfoItem icon="🔍" text="Search queries generated from your claims (sent to Tavily Search)" />
          <InfoItem icon="🤖" text="Claims and evidence sent to the LLM for verification" />
        </Section>

        <Section title="💾 What is stored">
          <InfoItem icon="📱" text="Verification results are stored locally on your device only" />
          <InfoItem icon="🔢" text="A random guest ID to identify your session (not linked to identity)" />
          <InfoItem icon="⚙️" text="Your app preferences and settings" />
        </Section>

        <Section title="🚫 What we never do">
          <InfoItem icon="✓" text="Never store your original AI response on our servers permanently" />
          <InfoItem icon="✓" text="Never share your data with third parties for advertising" />
          <InfoItem icon="✓" text="Never require you to create an account" />
          <InfoItem icon="✓" text="Never fabricate evidence or citations" />
        </Section>

        <Section title="⏱ Data retention">
          <InfoItem icon="📋" text="Local history: kept until you delete it (max 100 entries)" />
          <InfoItem icon="🔒" text="Server-side: verification sessions may be cached for up to 24 hours for performance" />
        </Section>

        {/* Settings */}
        <Section title="⚙️ Preferences">
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Save verification history</Text>
              <Text style={styles.settingDesc}>Store results locally on device</Text>
            </View>
            <Switch
              value={saveHistory}
              onValueChange={handleSaveHistoryChange}
              trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Privacy mode</Text>
              <Text style={styles.settingDesc}>Don't save input text in history</Text>
            </View>
            <Switch
              value={privacyMode}
              onValueChange={handlePrivacyModeChange}
              trackColor={{ false: Colors.surfaceBorder, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </Section>

        {/* Danger zone */}
        <Section title="🗑 Data Management">
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearHistory}>
            <Text style={styles.dangerBtnText}>Clear Verification History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerBtn, styles.dangerBtnCritical]} onPress={handleClearAll}>
            <Text style={[styles.dangerBtnText, { color: Colors.false }]}>Clear All App Data</Text>
          </TouchableOpacity>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl },
  intro: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_700Bold',
    marginBottom: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  infoIcon: { fontSize: 18, width: 24 },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  settingInfo: { flex: 1 },
  settingLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_500Medium' },
  settingDesc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_400Regular', marginTop: 2 },
  dangerBtn: {
    padding: Spacing.base,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  dangerBtnCritical: { borderBottomWidth: 0 },
  dangerBtnText: { color: Colors.unverifiable, fontSize: Typography.fontSize.base, fontFamily: 'Inter_500Medium' },
});
