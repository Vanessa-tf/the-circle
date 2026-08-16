import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AuthTextField from "../components/AuthTextField";
import ChipSelect from "../components/ChipSelect";
import { useClaims } from "../context/ClaimsContext";
import { SKILL_CATEGORIES, SkillCategory, VERIFIER_TYPES } from "../constants/scoring";
import { colors, radii } from "../constants/theme";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

type SentState = { emailSent: boolean; verifierEmail: string; shareLink: string };

export default function NewClaim() {
  const { submitClaim } = useClaims();

  const [title, setTitle] = useState("");
  const [skillCategory, setSkillCategory] = useState<SkillCategory | null>(null);
  const [points, setPoints] = useState("");
  const [org, setOrg] = useState("");
  const [verifiedBy, setVerifiedBy] = useState<string | null>(null);
  const [verifierEmail, setVerifierEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<SentState | null>(null);

  const pointsNumber = Number(points);
  const canSubmit =
    title.trim().length > 0 &&
    skillCategory !== null &&
    Number.isFinite(pointsNumber) &&
    pointsNumber > 0 &&
    org.trim().length > 0 &&
    verifiedBy !== null &&
    EMAIL_RE.test(verifierEmail.trim());

  const onSubmit = async () => {
    if (!canSubmit || !skillCategory || !verifiedBy) return;
    setError(null);
    setSubmitting(true);
    try {
      const claim = await submitClaim({
        title: title.trim(),
        skill_category: skillCategory,
        points: pointsNumber,
        org: org.trim(),
        verified_by: verifiedBy,
        verifier_email: verifierEmail.trim(),
      });
      const baseUrl = process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:8081";
      setSent({
        emailSent: claim.emailSent,
        verifierEmail: verifierEmail.trim(),
        shareLink: `${baseUrl}/verify/${claim.verify_token}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onShare = () => {
    if (sent) Share.share({ message: sent.shareLink });
  };

  if (sent?.emailSent) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>REQUEST SENT</Text>
          <Text style={styles.title}>Verification email sent</Text>
          <Text style={styles.subtitle}>
            We emailed {sent.verifierEmail} asking them to confirm this. You'll see it here once
            they respond.
          </Text>

          <Pressable style={styles.submitButton} onPress={() => router.back()}>
            <Text style={styles.submitText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>REQUEST SENT</Text>
          <Text style={styles.title}>Share this link with your verifier</Text>
          <Text style={styles.subtitle}>
            We couldn't send the verification email automatically, so share this link with{" "}
            {sent.verifierEmail} yourself. Once they approve it, it'll show up as a real credit.
          </Text>

          <View style={styles.linkBox}>
            <Text style={styles.linkText} selectable numberOfLines={2}>
              {sent.shareLink}
            </Text>
          </View>

          <Pressable style={styles.submitButton} onPress={onShare}>
            <Text style={styles.submitText}>Share link</Text>
          </Pressable>

          <Pressable style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>New verification request</Text>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AuthTextField
            label="What are you claiming?"
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            placeholder="e.g. Q2 sales pipeline system"
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

          <AuthTextField
            label="Organization"
            value={org}
            onChangeText={setOrg}
            autoCapitalize="words"
            placeholder="e.g. Sable Fintech"
          />

          <ChipSelect
            label="Who's verifying this?"
            options={VERIFIER_TYPES}
            value={verifiedBy}
            onChange={setVerifiedBy}
          />

          <AuthTextField
            label="Verifier's email"
            value={verifierEmail}
            onChangeText={setVerifierEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="verifier@example.com"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[
              styles.submitButton,
              (!canSubmit || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={!canSubmit || submitting}
          >
            <Text style={styles.submitText}>
              {submitting ? "Sending…" : "Send verification request"}
            </Text>
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
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentDark,
    letterSpacing: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  linkBox: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  linkText: {
    fontSize: 14,
    color: colors.accentDark,
    fontWeight: "600",
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
  doneButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 10,
  },
  doneText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
