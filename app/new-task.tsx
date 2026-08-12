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
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AuthTextField from "../components/AuthTextField";
import ChipSelect from "../components/ChipSelect";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../context/TasksContext";
import { SKILL_CATEGORIES, SkillCategory } from "../constants/scoring";
import { colors, radii } from "../constants/theme";

function closeScreen() {
  if (Platform.OS === "web") {
    window.location.href = "/";
  } else {
    router.replace("/");
  }
}

export default function NewTask() {
  const { profile } = useAuth();
  const { createTask } = useTasks();
  const isInstitution = profile?.account_type === "Institution";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillCategory, setSkillCategory] = useState<SkillCategory | null>(null);
  const [points, setPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pointsNumber = Number(points);
  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    skillCategory !== null &&
    Number.isFinite(pointsNumber) &&
    pointsNumber > 0;

  const onSubmit = async () => {
    if (!canSubmit || !skillCategory) return;
    setError(null);
    setSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        skill_category: skillCategory,
        points: pointsNumber,
        deadline: null,
      });
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
        <Text style={styles.headerTitle}>{isInstitution ? "New assignment" : "New task"}</Text>
        <Pressable style={styles.closeButton} onPress={() => closeScreen()}>
          <Feather name="x" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AuthTextField
            label="Title"
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            placeholder="e.g. Build a landing page"
          />

          <AuthTextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            autoCapitalize="sentences"
            multiline
            placeholder="What does someone need to do to complete this?"
            style={styles.multiline}
          />

          <ChipSelect
            label="Skill category"
            options={SKILL_CATEGORIES}
            value={skillCategory}
            onChange={(v) => setSkillCategory(v as SkillCategory)}
          />

          <AuthTextField
            label="Points"
            value={points}
            onChangeText={setPoints}
            keyboardType="numeric"
            placeholder="e.g. 40"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit || submitting}
          >
            <Text style={styles.submitText}>{submitting ? "Posting…" : "Post"}</Text>
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
