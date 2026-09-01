import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import OverviewSection from "../../components/OverviewSection";
import JobSearchSection from "../../components/JobSearchSection";
import Avatar from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import { getFirstName } from "../../lib/initials";
import { colors, radii } from "../../constants/theme";

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export default function Home() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "jobsearch">("overview");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.roundButton} onPress={() => router.push("/search")}>
            <Feather name="search" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.greeting}>Welcome back, {getFirstName(profile?.full_name)}</Text>
          </View>
          <Avatar name={profile?.full_name} avatarUrl={profile?.avatar_url} size={40} />
        </View>

        <View style={styles.tabSwitch}>
          <Pressable
            style={[styles.tabButton, activeTab === "overview" && styles.tabButtonActive]}
            onPress={() => setActiveTab("overview")}
          >
            <Text style={[styles.tabLabel, activeTab === "overview" && styles.tabLabelActive]}>
              Overview
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "jobsearch" && styles.tabButtonActive]}
            onPress={() => setActiveTab("jobsearch")}
          >
            <Text style={[styles.tabLabel, activeTab === "jobsearch" && styles.tabLabelActive]}>
              Job search
            </Text>
          </Pressable>
        </View>

        {activeTab === "overview" ? <OverviewSection /> : <JobSearchSection />}
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
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  date: {
    fontSize: 13,
    color: colors.accentDark,
    marginBottom: 6,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#E2E6ED",
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: colors.card,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
});
