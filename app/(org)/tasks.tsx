import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useTasks } from "../../context/TasksContext";
import { colors, radii } from "../../constants/theme";

export default function OrgTasks() {
  const { profile } = useAuth();
  const { myTasks, incomingSubmissions } = useTasks();
  const isInstitution = profile?.account_type === "Institution";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{isInstitution ? "Assignments" : "Tasks"}</Text>
          <Pressable style={styles.addButton} onPress={() => router.push("/new-task")}>
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        </View>

        {myTasks.length === 0 && (
          <Text style={styles.emptyText}>
            {isInstitution
              ? "You haven't posted any assignments yet."
              : "You haven't posted any tasks yet."}
          </Text>
        )}

        {myTasks.map((task) => {
          const submissionCount = incomingSubmissions.filter((s) => s.task_id === task.id).length;
          return (
            <Pressable
              key={task.id}
              style={styles.taskCard}
              onPress={() => router.push(`/(org)/task/${task.id}`)}
            >
              <View style={styles.taskHeaderRow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={[styles.statusPill, task.status === "closed" && styles.statusPillClosed]}>
                  <Text
                    style={[styles.statusText, task.status === "closed" && styles.statusTextClosed]}
                  >
                    {task.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.taskMeta}>
                {task.skill_category} · +{task.points} pts · {submissionCount} submission
                {submissionCount === 1 ? "" : "s"}
              </Text>
            </Pressable>
          );
        })}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  taskHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginRight: 8,
  },
  taskMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusPill: {
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusPillClosed: {
    backgroundColor: colors.iconBgGray,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accentDark,
    textTransform: "capitalize",
  },
  statusTextClosed: {
    color: colors.textMuted,
  },
});
