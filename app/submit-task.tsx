import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AuthTextField from "../components/AuthTextField";
import { useTasks } from "../context/TasksContext";
import { colors, radii } from "../constants/theme";

function closeScreen() {
  if (Platform.OS === "web") {
    window.location.href = "/";
  } else {
    router.replace("/");
  }
}

export default function SubmitTask() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { tasks, submitWork } = useTasks();
  const task = tasks.find((t) => t.id === taskId);

  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!taskId || evidence.trim().length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitWork(taskId, evidence.trim());
      closeScreen();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Submit work</Text>
        <Pressable style={styles.closeButton} onPress={() => closeScreen()}>
          <Feather name="x" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {task && (
            <View style={styles.taskCard}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskMeta}>
                {task.skill_category} · +{task.points} pts
              </Text>
            </View>
          )}

          <AuthTextField
            label="Evidence"
            value={evidence}
            onChangeText={setEvidence}
            autoCapitalize="sentences"
            multiline
            placeholder="Link to your work, or describe what you completed"
            style={styles.multiline}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[
              styles.submitButton,
              (evidence.trim().length === 0 || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={evidence.trim().length === 0 || submitting}
          >
            <Text style={styles.submitText}>{submitting ? "Submitting…" : "Submit"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 20,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  error: {
    fontSize: 13,
    color: "#D9534F",
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.dark,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
