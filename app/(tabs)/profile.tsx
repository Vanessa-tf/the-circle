import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import ScoreLineChart from "../../components/ScoreLineChart";
import ActivityHeatmap from "../../components/ActivityHeatmap";
import SkillPill from "../../components/SkillPill";
import ProjectItem from "../../components/ProjectItem";
import { useAuth } from "../../context/AuthContext";
import { useCredits } from "../../context/CreditsContext";
import { SKILL_CATEGORIES } from "../../constants/scoring";
import { getInitials } from "../../lib/initials";
import { formatShortDate } from "../../lib/formatDate";
import { colors, radii } from "../../constants/theme";

export default function Profile() {
  const { profile, signOut } = useAuth();
  const { totalScore, skillTotals, verificationsCount, scoreHistory, timelineCredits, credits } =
    useCredits();
  const roleLocation = [profile?.role, profile?.location].filter(Boolean).join(" · ");

  const stats = [
    { value: String(totalScore), label: "CIRCLE SCORE", accent: true },
    { value: String(totalScore), label: "SKILL CREDITS", accent: false },
    { value: String(verificationsCount), label: "VERIFICATIONS", accent: false },
  ];

  const skills = SKILL_CATEGORIES.map((category) => ({
    name: category,
    count: skillTotals[category],
  }));

  const projects = timelineCredits.map((c) => ({
    id: c.id,
    title: c.title,
    subtitle: `${c.verified_by} · ${formatShortDate(c.awarded_at)}`,
  }));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.roundButton} onPress={() => signOut()}>
            <Feather name="log-out" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>
            </View>
          </View>
          <Text style={styles.name}>{profile?.full_name || "Add your name"}</Text>
          <Text style={styles.role}>{roleLocation || "Add your role & location"}</Text>

          <Pressable style={styles.editButton} onPress={() => router.push("/edit-profile")}>
            <Text style={styles.editButtonText}>Edit profile</Text>
          </Pressable>

          {verificationsCount > 0 && (
            <View style={styles.badgeRow}>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified Professional</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, s.accent && styles.statValueAccent]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Score growth</Text>
        <View style={styles.sectionSpacing}>
          <ScoreLineChart data={scoreHistory} />
        </View>

        <Text style={styles.sectionTitle}>Activity heatmap</Text>
        <View style={styles.sectionSpacing}>
          <ActivityHeatmap dates={credits.map((c) => c.awarded_at)} />
        </View>

        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsRow}>
          {skills.map((skill) => (
            <SkillPill key={skill.name} {...skill} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Verified projects</Text>
        {projects.map(({ id, ...project }) => (
          <ProjectItem key={id} {...project} />
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
    marginBottom: 12,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  verifiedBadge: {
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentDark,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  statValueAccent: {
    color: colors.accentDark,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  sectionSpacing: {
    marginBottom: 24,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
});
