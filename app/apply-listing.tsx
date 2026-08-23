import React, { useEffect, useState } from "react";
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
import { useListings } from "../context/ListingsContext";
import { colors, radii } from "../constants/theme";

function closeScreen() {
  if (Platform.OS === "web") {
    window.location.href = "/";
  } else {
    router.replace("/");
  }
}

const NOTE_LABEL: Record<string, string> = {
  Jobs: "Cover note",
  Freelance: "Pitch note",
  Investors: "Pitch note",
  Mentors: "Message to mentor",
};

export default function ApplyListing() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { listings, apply, isApplied } = useListings();
  const listing = listings.find((l) => l.id === listingId);
  const alreadyApplied = listingId ? isApplied(listingId) : false;

  const [note, setNote] = useState("");
  const [answerValues, setAnswerValues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const questions = listing?.questions ?? [];
  const hasQuestions = questions.length > 0;

  useEffect(() => {
    if (questions.length > 0) {
      setAnswerValues((prev) =>
        prev.length === questions.length ? prev : questions.map(() => "")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id, questions.length]);

  const noteLabel = listing
    ? hasQuestions
      ? "Anything else you'd like to add? (optional)"
      : NOTE_LABEL[listing.category] ?? "Note"
    : "Note";

  const answersFilled = !hasQuestions || answerValues.every((a) => a.trim().length > 0);
  const canSubmit = answersFilled && (hasQuestions || note.trim().length > 0);

  const updateAnswer = (index: number, text: string) =>
    setAnswerValues((prev) => prev.map((a, i) => (i === index ? text : a)));

  const onSubmit = async () => {
    if (!listingId || !canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const answers = questions.map((question, i) => ({
        question,
        answer: answerValues[i]?.trim() ?? "",
      }));
      await apply(listingId, note.trim(), answers);
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
        <Text style={styles.headerTitle}>{listing?.action_label ?? "Apply"}</Text>
        <Pressable style={styles.closeButton} onPress={() => closeScreen()}>
          <Feather name="x" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {listing && (
            <View style={styles.listingCard}>
              <Text style={styles.listingTitle}>{listing.title}</Text>
              <Text style={styles.listingMeta}>{listing.subtitle}</Text>
            </View>
          )}

          {alreadyApplied ? (
            <Text style={styles.appliedText}>
              You've already sent this one — hang tight for a response.
            </Text>
          ) : (
            <>
              {questions.map((question, index) => (
                <AuthTextField
                  key={index}
                  label={question}
                  value={answerValues[index] ?? ""}
                  onChangeText={(text) => updateAnswer(index, text)}
                  autoCapitalize="sentences"
                  multiline
                  style={styles.multiline}
                />
              ))}

              <AuthTextField
                label={noteLabel}
                value={note}
                onChangeText={setNote}
                autoCapitalize="sentences"
                multiline
                placeholder="Why you're a fit, and anything they should know"
                style={styles.multiline}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]}
                onPress={onSubmit}
                disabled={!canSubmit || submitting}
              >
                <Text style={styles.submitText}>{submitting ? "Sending…" : "Send"}</Text>
              </Pressable>
            </>
          )}
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
  listingCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 20,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  listingMeta: {
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
  appliedText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
});
