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
import { useCredits } from "../context/CreditsContext";
import { useListings, ListingCategory, NewListingInput } from "../context/ListingsContext";
import { SKILL_CATEGORIES, SkillCategory } from "../constants/scoring";
import { colors, radii } from "../constants/theme";

function closeScreen() {
  if (Platform.OS === "web") {
    window.location.href = "/";
  } else {
    router.replace("/");
  }
}

const ORG_CATEGORIES: ListingCategory[] = ["Jobs", "Freelance", "Investors", "Startups"];
const INDIVIDUAL_CATEGORIES: ListingCategory[] = ["Mentors"];

export default function NewListing() {
  const { profile } = useAuth();
  const { totalScore } = useCredits();
  const { createListing } = useListings();
  const isOrg = profile?.account_type === "Company" || profile?.account_type === "Institution";
  const allowedCategories = isOrg ? ORG_CATEGORIES : INDIVIDUAL_CATEGORIES;

  const [category, setCategory] = useState<ListingCategory>(allowedCategories[0]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [amountText, setAmountText] = useState("");
  const [scoreRequired, setScoreRequired] = useState("");
  const [scoreCategory, setScoreCategory] = useState<SkillCategory | null>(null);
  const [sessionLength, setSessionLength] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scoreRequiredNumber = Number(scoreRequired);
  const needsAmount = category === "Jobs" || category === "Freelance" || category === "Investors";
  const needsScore = category === "Jobs" || category === "Freelance" || category === "Investors";
  const canHaveQuestions = category !== "Startups";
  const trimmedQuestions = questions.map((q) => q.trim()).filter((q) => q.length > 0);

  const canSubmit =
    title.trim().length > 0 &&
    subtitle.trim().length > 0 &&
    (!needsAmount || amountText.trim().length > 0) &&
    (!needsScore || (Number.isFinite(scoreRequiredNumber) && scoreRequiredNumber > 0)) &&
    (category !== "Mentors" || sessionLength.trim().length > 0);

  const addQuestion = () => setQuestions((prev) => [...prev, ""]);
  const updateQuestion = (index: number, text: string) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? text : q)));
  const removeQuestion = (index: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index));

  const buildInput = (): NewListingInput => {
    switch (category) {
      case "Jobs":
        return {
          category,
          title: title.trim(),
          subtitle: subtitle.trim(),
          metric_label: "SCORE REQUIRED",
          metric_value: `${scoreRequiredNumber}+`,
          secondary_label: "SALARY",
          secondary_value: amountText.trim(),
          secondary_value_accent: false,
          action_label: "Apply",
          button_variant: "dark",
          score_required: scoreRequiredNumber,
          score_required_category: null,
          questions: trimmedQuestions,
        };
      case "Freelance":
        return {
          category,
          title: title.trim(),
          subtitle: subtitle.trim(),
          metric_label: "BUDGET",
          metric_value: amountText.trim(),
          secondary_label: "CREDITS REQUIRED",
          secondary_value: scoreCategory
            ? `${scoreRequiredNumber} ${scoreCategory}`
            : `${scoreRequiredNumber}+`,
          secondary_value_accent: true,
          action_label: "Apply",
          button_variant: "accent",
          score_required: scoreRequiredNumber,
          score_required_category: scoreCategory,
          questions: trimmedQuestions,
        };
      case "Investors":
        return {
          category,
          title: title.trim(),
          subtitle: subtitle.trim(),
          metric_label: "CHECK SIZE",
          metric_value: amountText.trim(),
          secondary_label: "MIN FOUNDER SCORE",
          secondary_value: `${scoreRequiredNumber}+`,
          secondary_value_accent: false,
          action_label: "Pitch",
          button_variant: "dark",
          score_required: scoreRequiredNumber,
          score_required_category: null,
          questions: trimmedQuestions,
        };
      case "Startups":
        return {
          category,
          title: title.trim(),
          subtitle: subtitle.trim(),
          metric_label: "TEAM SCORE AVG",
          metric_value: "—",
          secondary_label: "OPEN ROLES",
          secondary_value: "—",
          secondary_value_accent: false,
          action_label: "View",
          button_variant: "dark",
          score_required: null,
          score_required_category: null,
          questions: [],
        };
      case "Mentors":
      default:
        return {
          category: "Mentors",
          title: title.trim(),
          subtitle: subtitle.trim(),
          metric_label: "SESSIONS",
          metric_value: sessionLength.trim(),
          secondary_label: "MENTOR SCORE",
          secondary_value: String(totalScore),
          secondary_value_accent: true,
          action_label: "Book",
          button_variant: "accent",
          score_required: null,
          score_required_category: null,
          questions: trimmedQuestions,
        };
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await createListing(buildInput());
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
        <Text style={styles.headerTitle}>New listing</Text>
        <Pressable style={styles.closeButton} onPress={() => closeScreen()}>
          <Feather name="x" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {allowedCategories.length > 1 && (
            <ChipSelect
              label="Category"
              options={allowedCategories}
              value={category}
              onChange={(v) => setCategory(v as ListingCategory)}
            />
          )}

          <AuthTextField
            label={category === "Investors" ? "Fund name" : category === "Mentors" ? "Topic" : "Title"}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            placeholder={
              category === "Investors"
                ? "e.g. Amara Ventures"
                : category === "Mentors"
                ? "e.g. Fundraising strategy"
                : "e.g. Product Analyst"
            }
          />

          <AuthTextField
            label="Description"
            value={subtitle}
            onChangeText={setSubtitle}
            autoCapitalize="sentences"
            multiline
            placeholder="Give applicants the context they need"
            style={styles.multiline}
          />

          {needsAmount && (
            <AuthTextField
              label={
                category === "Jobs" ? "Salary" : category === "Freelance" ? "Budget" : "Check size"
              }
              value={amountText}
              onChangeText={setAmountText}
              placeholder={category === "Investors" ? "e.g. R50-250k" : "e.g. R70-90k"}
            />
          )}

          {needsScore && (
            <AuthTextField
              label={category === "Investors" ? "Min founder score" : "Score required"}
              value={scoreRequired}
              onChangeText={setScoreRequired}
              keyboardType="numeric"
              placeholder="e.g. 750"
            />
          )}

          {category === "Freelance" && (
            <ChipSelect
              label="Skill category (optional)"
              options={SKILL_CATEGORIES}
              value={scoreCategory}
              onChange={(v) => setScoreCategory(scoreCategory === v ? null : (v as SkillCategory))}
            />
          )}

          {category === "Mentors" && (
            <AuthTextField
              label="Session length"
              value={sessionLength}
              onChangeText={setSessionLength}
              placeholder="e.g. 30 min"
            />
          )}

          {category === "Startups" && (
            <Text style={styles.hint}>
              Team score avg and open roles are computed automatically from your roster and job
              listings — no need to enter them.
            </Text>
          )}

          {canHaveQuestions && (
            <View style={styles.questionsSection}>
              <Text style={styles.label}>Application questions (optional)</Text>
              <Text style={styles.hint}>
                Applicants answer these instead of just leaving a generic note.
              </Text>
              {questions.map((q, index) => (
                <View key={index} style={styles.questionRow}>
                  <View style={styles.questionInput}>
                    <AuthTextField
                      label={`Question ${index + 1}`}
                      value={q}
                      onChangeText={(text) => updateQuestion(index, text)}
                      autoCapitalize="sentences"
                      placeholder="e.g. Why are you a fit for this role?"
                    />
                  </View>
                  <Pressable
                    style={styles.removeQuestionButton}
                    onPress={() => removeQuestion(index)}
                    hitSlop={8}
                  >
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.addQuestionButton} onPress={addQuestion}>
                <Feather name="plus" size={14} color={colors.textPrimary} />
                <Text style={styles.addQuestionText}>Add question</Text>
              </Pressable>
            </View>
          )}

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
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  questionsSection: {
    marginBottom: 8,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionInput: {
    flex: 1,
  },
  removeQuestionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  addQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  addQuestionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
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
