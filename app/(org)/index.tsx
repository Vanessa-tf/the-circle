import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import { useTasks } from "../../context/TasksContext";
import { colors, radii } from "../../constants/theme";

export default function OrgDashboard() {
  const { profile } = useAuth();
  const { myTasks, incomingSubmissions } = useTasks();

  const isInstitution = profile?.account_type === "Institution";
  const openTasksCount = myTasks.filter((t) => t.status === "open").length;
  const pending = incomingSubmissions.filter((s) => s.status === "pending");
  const approvedCount = incomingSubmissions.filter((s) => s.status === "approved").length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>THE CIRCLE</Text>
        <Text style={styles.title}>{profile?.full_name || "Your organization"}</Text>
        <Text style={styles.subtitle}>
          {isInstitution
            ? "Manage assignments and verify student work."
            : "Post tasks and verify completed work."}
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            icon="clipboard"
            iconBg={colors.iconBgBlue}
            iconColor={colors.accentDark}
            value={String(openTasksCount)}
            label={isInstitution ? "OPEN ASSIGNMENTS" : "OPEN TASKS"}
          />
          <StatCard
            icon="clock"
            iconBg={colors.iconBgYellow}
            iconColor={colors.accentDark}
            value={String(pending.length)}
            label="NEEDS REVIEW"
          />
          <StatCard
            icon="check-circle"
            iconBg={colors.iconBgGreen}
            iconColor={colors.accentDark}
            value={String(approvedCount)}
            label="CREDITS AWARDED"
          />
        </View>

        <Text style={styles.sectionTitle}>Needs review</Text>
        {pending.length === 0 ? (
          <Text style={styles.emptyText}>No pending submissions right now.</Text>
        ) : (
          pending.slice(0, 5).map((s) => (
            <Pressable
              key={s.id}
              style={styles.reviewCard}
              onPress={() => router.push(`/(org)/task/${s.task_id}`)}
            >
              <Text style={styles.reviewTitle}>{s.task_title}</Text>
              <Text style={styles.reviewMeta}>{s.submitter_name ?? "Someone"} submitted work</Text>
            </Pressable>
          ))
        )}
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
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentDark,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reviewMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
