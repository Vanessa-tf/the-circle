import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTasks } from "../../../context/TasksContext";
import { colors, radii } from "../../../constants/theme";

function goBack() {
  if (Platform.OS === "web") {
    window.location.href = "/(org)/tasks";
  } else {
    router.replace("/(org)/tasks");
  }
}

export default function TaskReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { myTasks, incomingSubmissions, resolveSubmission, closeTask } = useTasks();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const task = myTasks.find((t) => t.id === id);
  const submissions = incomingSubmissions.filter((s) => s.task_id === id);

  const onResolve = async (submissionId: string, approve: boolean) => {
    setResolvingId(submissionId);
    try {
      await resolveSubmission(submissionId, approve);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton} onPress={goBack}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          {task?.status === "open" && (
            <Pressable style={styles.closeTaskButton} onPress={() => closeTask(task.id)}>
              <Text style={styles.closeTaskText}>Close task</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.title}>{task?.title ?? "Task"}</Text>
        {task && (
          <Text style={styles.subtitle}>
            {task.skill_category} · +{task.points} pts · {task.status}
          </Text>
        )}

        <Text style={styles.sectionTitle}>Submissions</Text>
        {submissions.length === 0 && (
          <Text style={styles.emptyText}>No submissions yet.</Text>
        )}

        {submissions.map((s) => (
          <View key={s.id} style={styles.submissionCard}>
            <Text style={styles.submitterName}>{s.submitter_name ?? "Someone"}</Text>
            <Text style={styles.evidence}>{s.evidence}</Text>

            {s.status === "pending" ? (
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.approveButton, resolvingId === s.id && styles.buttonDisabled]}
                  disabled={resolvingId === s.id}
                  onPress={() => onResolve(s.id, true)}
                >
                  <Text style={styles.approveText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.rejectButton, resolvingId === s.id && styles.buttonDisabled]}
                  disabled={resolvingId === s.id}
                  onPress={() => onResolve(s.id, false)}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.statusPill, s.status === "rejected" && styles.statusPillRejected]}>
                <Text
                  style={[styles.statusText, s.status === "rejected" && styles.statusTextRejected]}
                >
                  {s.status === "approved" ? "Approved" : "Rejected"}
                </Text>
              </View>
            )}
          </View>
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
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  closeTaskButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeTaskText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
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
  submissionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  submitterName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  evidence: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.dark,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  approveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  statusPillRejected: {
    backgroundColor: colors.iconBgGray,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentDark,
  },
  statusTextRejected: {
    color: colors.textMuted,
  },
});
