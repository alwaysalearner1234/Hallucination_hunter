import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <View>
            <Text style={styles.smallText}>WELCOME TO</Text>

            <Text style={styles.logo}>
              Verify
              <Text style={styles.logoAccent}>It ⚖️</Text>
            </Text>
          </View>

          <Pressable
            style={styles.profile}
            onPress={() => router.push("/privacy")}
          >
            <Text style={styles.profileText}>A</Text>
          </Pressable>
        </View>

        {/* ================= INSTRUMENT VERIFICATION PORTAL (M1 + M3) ================= */}
        <View style={styles.portalHero}>
          <Text style={styles.portalHeroTitle}>
            Instrument Verification Portal
          </Text>

          <Text style={styles.portalHeroDesc}>
            Online Statutory Verification System for Weighing & Measuring Instruments: Trader Management, Inspector Scheduling, SHA-256 PDF Certificates, and QR Tamper Verification.
          </Text>

          <View style={styles.portalButtonsGrid}>
            <Pressable
              style={({ pressed }) => [styles.portalBtn, styles.portalTraderBtn, pressed && styles.pressed]}
              onPress={() => router.push("/portal/trader" as never)}
            >
              <Text style={styles.portalBtnIcon}>🏪</Text>
              <View>
                <Text style={styles.portalBtnTitle}>Trader Portal</Text>
                <Text style={styles.portalBtnSub}>Overview, Registry & Applications</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.portalBtn, styles.portalAdminBtn, pressed && styles.pressed]}
              onPress={() => router.push("/portal/admin" as never)}
            >
              <Text style={styles.portalBtnIcon}>🏛️</Text>
              <View>
                <Text style={styles.portalBtnTitle}>Admin / Inspector</Text>
                <Text style={styles.portalBtnSub}>Assignments, Scheduling & Tests</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.portalBtn, styles.portalVerifyBtn, pressed && styles.pressed]}
              onPress={() => router.push("/portal/verify-certificate" as never)}
            >
              <Text style={styles.portalBtnIcon}>🛡️</Text>
              <View>
                <Text style={styles.portalBtnTitle}>Public QR Verification</Text>
                <Text style={styles.portalBtnSub}>SHA-256 Hash & Tamper Audit</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.portalBtn, styles.portalAiBtn, pressed && styles.pressed]}
              onPress={() => router.push("/portal/ai-assistant" as never)}
            >
              <Text style={styles.portalBtnIcon}>🤖</Text>
              <View>
                <Text style={styles.portalBtnTitle}>Regulatory AI Assistant</Text>
                <Text style={styles.portalBtnSub}>RAG with Document Citations</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ================= HERO ================= */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>AI VERIFICATION</Text>
          </View>

          <Text style={styles.heroTitle}>
            Verify information.
            {"\n"}
            <Text style={styles.heroAccent}>Find the truth.</Text>
          </Text>

          <Text style={styles.heroDescription}>
            Detect misleading claims, analyze evidence, and verify information
            using AI-powered verification.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/verify")}
          >
            <Text style={styles.primaryButtonText}>
              Start Verification
            </Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        </View>

        {/* ================= STATS ================= */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>AI</Text>
            <Text style={styles.statLabel}>Powered</Text>
          </View>
        </View>

        {/* ================= MAIN FEATURES ================= */}
        <Text style={styles.sectionTitle}>
          What do you want to verify?
        </Text>

        <View style={styles.grid}>
          {/* VERIFY CLAIM */}
          <Pressable
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/verify")}
          >
            <View style={[styles.iconBox, styles.blueIcon]}>
              <Text style={styles.icon}>✓</Text>
            </View>

            <Text style={styles.featureTitle}>Verify Claim</Text>

            <Text style={styles.featureDescription}>
              Check whether a claim is reliable or misleading.
            </Text>

            <Text style={styles.cardArrow}>→</Text>
          </Pressable>

          {/* ANALYZE */}
          <Pressable
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/verify")}
          >
            <View style={[styles.iconBox, styles.purpleIcon]}>
              <Text style={styles.icon}>⌕</Text>
            </View>

            <Text style={styles.featureTitle}>Analyze</Text>

            <Text style={styles.featureDescription}>
              Analyze text and detect possible hallucinations.
            </Text>

            <Text style={styles.cardArrow}>→</Text>
          </Pressable>

          {/* SCREENSHOT */}
          <Pressable
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/screenshot")}
          >
            <View style={[styles.iconBox, styles.greenIcon]}>
              <Text style={styles.icon}>▣</Text>
            </View>

            <Text style={styles.featureTitle}>Scan Screenshot</Text>

            <Text style={styles.featureDescription}>
              Upload a screenshot and verify the information inside it.
            </Text>

            <Text style={styles.cardArrow}>→</Text>
          </Pressable>

          {/* HISTORY */}
          <Pressable
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/history")}
          >
            <View style={[styles.iconBox, styles.orangeIcon]}>
              <Text style={styles.icon}>↺</Text>
            </View>

            <Text style={styles.featureTitle}>History</Text>

            <Text style={styles.featureDescription}>
              View your previous verification results.
            </Text>

            <Text style={styles.cardArrow}>→</Text>
          </Pressable>
        </View>

        {/* ================= RECENT ACTIVITY ================= */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          <Pressable onPress={() => router.push("/history")}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>

        {/* ACTIVITY 1 */}
        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Text style={styles.activityIconText}>✓</Text>
          </View>

          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>
              Verification completed
            </Text>

            <Text style={styles.activityDescription}>
              Your claim analysis is ready to view.
            </Text>
          </View>

          <Text style={styles.success}>Verified</Text>
        </View>

        {/* ACTIVITY 2 */}
        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Text style={styles.activityIconText}>⌕</Text>
          </View>

          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>
              AI analysis completed
            </Text>

            <Text style={styles.activityDescription}>
              Evidence analysis has been completed.
            </Text>
          </View>

          <Text style={styles.success}>Done</Text>
        </View>

        {/* ================= FOOTER ================= */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>VerifyIt</Text>

          <Text style={styles.footerText}>
            Verify Instruments. Verify AI. Discover the truth.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ================= GENERAL ================= */

  safeArea: {
    flex: 1,
    backgroundColor: "#080B14",
  },

  container: {
    padding: 24,
    paddingBottom: 50,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  /* ================= HEADER ================= */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },

  smallText: {
    color: "#7C8498",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },

  logo: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },

  logoAccent: {
    color: "#6C63FF",
  },

  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#171C2B",
    borderWidth: 1,
    borderColor: "#30374D",
    justifyContent: "center",
    alignItems: "center",
  },

  profileText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  /* ================= PORTAL HERO ================= */

  portalHero: {
    backgroundColor: "#0F1322",
    borderRadius: 24,
    padding: 26,
    borderWidth: 1.5,
    borderColor: "#3D387A",
    marginBottom: 24,
  },

  portalBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(108, 99, 255, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(108, 99, 255, 0.5)",
  },

  portalBadgeText: {
    color: "#00D4FF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  portalHeroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },

  portalHeroDesc: {
    color: "#9AA3B7",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },

  portalButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  portalBtn: {
    width: "48%",
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },

  portalTraderBtn: {
    backgroundColor: "rgba(108, 99, 255, 0.12)",
    borderColor: "rgba(108, 99, 255, 0.35)",
  },

  portalAdminBtn: {
    backgroundColor: "rgba(0, 212, 255, 0.12)",
    borderColor: "rgba(0, 212, 255, 0.35)",
  },

  portalVerifyBtn: {
    backgroundColor: "rgba(0, 229, 160, 0.12)",
    borderColor: "rgba(0, 229, 160, 0.35)",
  },

  portalAiBtn: {
    backgroundColor: "rgba(255, 165, 2, 0.12)",
    borderColor: "rgba(255, 165, 2, 0.35)",
  },

  portalBtnIcon: {
    fontSize: 26,
  },

  portalBtnTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  portalBtnSub: {
    color: "#858EA3",
    fontSize: 11,
    marginTop: 2,
  },

  /* ================= HERO ================= */

  hero: {
    backgroundColor: "#111728",
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: "#252D43",
    marginBottom: 20,
  },

  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1C2140",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 18,
  },

  heroBadgeText: {
    color: "#8F88FF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 40,
    lineHeight: 47,
    fontWeight: "800",
    marginBottom: 14,
  },

  heroAccent: {
    color: "#7C74FF",
  },

  heroDescription: {
    color: "#9AA3B7",
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 650,
    marginBottom: 25,
  },

  primaryButton: {
    backgroundColor: "#6C63FF",
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  arrow: {
    color: "#FFFFFF",
    fontSize: 20,
  },

  /* ================= STATS ================= */

  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 32,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#111728",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#252D43",
    padding: 18,
  },

  statNumber: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 5,
  },

  statLabel: {
    color: "#7C8498",
    fontSize: 12,
  },

  /* ================= SECTION ================= */

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 16,
  },

  /* ================= FEATURE GRID ================= */

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 35,
  },

  featureCard: {
    width: "48%",
    minWidth: 250,
    backgroundColor: "#111728",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#252D43",
    position: "relative",
  },

  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  blueIcon: {
    backgroundColor: "#182C4D",
  },

  purpleIcon: {
    backgroundColor: "#29214D",
  },

  greenIcon: {
    backgroundColor: "#182C35",
  },

  orangeIcon: {
    backgroundColor: "#443020",
  },

  icon: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
  },

  featureTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },

  featureDescription: {
    color: "#7F899F",
    fontSize: 13,
    lineHeight: 20,
    paddingRight: 10,
  },

  cardArrow: {
    color: "#6C63FF",
    fontSize: 20,
    position: "absolute",
    right: 18,
    bottom: 18,
  },

  /* ================= ACTIVITY ================= */

  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  viewAll: {
    color: "#8F87FF",
    fontSize: 13,
    fontWeight: "700",
  },

  activityCard: {
    backgroundColor: "#111728",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#252D43",
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#19352F",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  activityIconText: {
    color: "#4ADE80",
    fontSize: 18,
    fontWeight: "900",
  },

  activityContent: {
    flex: 1,
  },

  activityTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  activityDescription: {
    color: "#7F899F",
    fontSize: 12,
  },

  success: {
    color: "#4ADE80",
    fontSize: 12,
    fontWeight: "700",
  },

  /* ================= FOOTER ================= */

  footer: {
    alignItems: "center",
    paddingTop: 35,
    paddingBottom: 10,
  },

  footerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 5,
  },

  footerText: {
    color: "#596176",
    fontSize: 12,
  },
});