import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import CreditTimelineItem from "../../components/CreditTimelineItem";
import PendingClaimItem from "../../components/PendingClaimItem";
import { useCredits } from "../../context/CreditsContext";
import { useClaims } from "../../context/ClaimsContext";
import { formatShortDate } from "../../lib/formatDate";
import { colors, radii } from "../../constants/theme";

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:8081";

export default function Credits() {
  const { totalScore, thisMonthDelta, verificationsCount, timelineCredits, refresh: refreshCredits } =
    useCredits();
  const { claims, refresh: refreshClaims } = useClaims();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshCredits(), refreshClaims()]);
    setRefreshing(false);
  };

  const summary = [
    { value: String(totalScore), label: "Total credits", accent: false },
    { value: `+${thisMonthDelta}`, label: "This month", accent: true },
    { value: String(verificationsCount), label: "Verifications", accent: false },
  ];

  const timeline = timelineCredits.map((c) => ({
    id: c.id,
    title: c.title,
    points: c.points,
    skillCategory: c.skill_category,
    verifierWeight: c.verifier_weight,
    consistencyFactor: c.consistency_factor,
    verifiedBy: c.verified_by,
    org: c.org,
    date: formatShortDate(c.awarded_at),
  }));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentDark} />
        }
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.roundButton}>
            <Feather name="more-horizontal" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Text style={styles.title}>Credits</Text>
        <Text style={styles.subtitle}>Every credit is verified by a real institution</Text>

        <Pressable style={styles.newRequestButton} onPress={() => router.push("/new-claim")}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.newRequestText}>Request verification</Text>
        </Pressable>

        <View style={styles.summaryCard}>
          {summary.map((item) => (
            <View key={item.label} style={styles.summaryItem}>
              <Text style={[styles.summaryValue, item.accent && styles.summaryValueAccent]}>
                {item.value}
              </Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {claims.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending verification</Text>
            {claims.map((c) => (
              <PendingClaimItem
                key={c.id}
                title={c.title}
                org={c.org}
                skillCategory={c.skill_category}
                status={c.status === "rejected" ? "rejected" : "pending"}
                shareLink={`${APP_URL}/verify/${c.verify_token}`}
              />
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Verification timeline</Text>

        {timeline.map(({ id, ...item }) => (
          <CreditTimelineItem key={id} {...item} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 20,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  newRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.dark,
    paddingVertical: 14,
    borderRadius: radii.pill,
    marginBottom: 20,
  },
  newRequestText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  summaryItem: {
    flex: 1,
    alignItems: "flex-start",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  summaryValueAccent: {
    color: colors.accentDark,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
});
