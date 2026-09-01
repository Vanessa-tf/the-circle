import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthTextField from "../components/AuthTextField";
import { useAuth } from "../context/AuthContext";
import { colors, radii } from "../constants/theme";

export default function ResetPassword() {
  const { completePasswordRecovery, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = password.length >= 6 && password === confirmPassword;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await completePasswordRecovery(password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>
            Choose a password you'll use to log in from now on.
          </Text>

          <AuthTextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            placeholder="••••••••"
          />
          <AuthTextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            placeholder="••••••••"
          />

          {password.length > 0 && password.length < 6 && (
            <Text style={styles.hint}>Password must be at least 6 characters.</Text>
          )}
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.hint}>Passwords don't match.</Text>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit || submitting}
          >
            <Text style={styles.submitText}>{submitting ? "Saving…" : "Save password"}</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={() => cancelPasswordRecovery()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
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
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
    marginTop: -8,
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
    opacity: 0.6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  cancelButton: {
    alignItems: "center",
    marginTop: 16,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
