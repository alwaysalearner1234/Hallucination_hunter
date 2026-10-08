import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.smallText}>WELCOME TO</Text>
            <Text style={styles.logo}>
              Hallucination <Text style={styles.logoAccent}>Hunter</Text>
            </Text>
          </View>

          <View style={styles.profile}>
            <Text style={styles.profileText}>A</Text>
          </View>
        </View>

        {/* Hero */}
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

          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start Verification</Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        </View>

        {/* Stats */}
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

        {/* Main Features */}
        <Text style={styles.sectionTitle}>What do you want to verify?</Text>

        <View style={styles.grid}>
          <Pressable style={styles.featureCard}>
            <View style={[styles.iconBox, styles.blueIcon]}>
              <Text style={styles.icon}>✓</Text>
            </View>

            <Text style={styles.featureTitle}>Verify Claim</Text>

            <Text style={styles.featureDescription}>
              Check whether a claim is reliable or misleading.
            </Text>

            <Text style={styles.cardArrow}>→</Text>
          </Pressable>

          <Pressable style={styles.featureCard}>
            <View style={[styles.iconBox, styles.purpleIcon]}>
              <Text style={styles.icon}>⌕</Text>
            </View>

            <Text style={styles.featureTitle}>Analyze</Text>

            <Text style={styles.featureDescription}>
              Analyze text and detect possible hallucinations.
            </Text>

            <Text style={styles.cardArrow}>→</Text>
          </Pressable>

          <Pressable style={styles.featureCard}>
            <View style={[styles.iconBox, styles.greenIcon]}>
              <Text style={styles.icon}>▣</Text>
            </View>

            <Text style={styles.featureTitle}>Scan Screenshot</Text>

            <Text style={styles.featureDescription}>
              Upload a screenshot and verify the information inside it.
            </Text>

            <Text style={styles.cardArrow}>→</Text>
          </Pressable>

          <Pressable style={styles.featureCard}>
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

        {/* Recent Activity */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          <Pressable>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Text style={styles.activityIconText}>✓</Text>
          </View>

          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Verification completed</Text>
            <Text style={styles.activityDescription}>
              Your claim analysis is ready to view.
            </Text>
          </View>

          <Text style={styles.success}>Verified</Text>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Text style={styles.activityIconText}>⌕</Text>
          </View>

          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Analysis completed</Text>
            <Text style={styles.activityDescription}>
              Evidence analysis has been completed.
            </Text>
          </View>

          <Text style={styles.success}>Done</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Hallucination Hunter</Text>
          <Text style={styles.footerText}>
            Verify. Analyze. Discover the truth.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: "800",
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
    fontWeight: "800",
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

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 16,
  },

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
    backgroundColor: "#183C35",
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

  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  viewAll: {
    color: "#817AFF",
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
    fontWeight: "800",
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