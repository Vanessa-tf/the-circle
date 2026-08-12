import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import AuthTextField from "../../components/AuthTextField";
import ChipSelect from "../../components/ChipSelect";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import { useAuth } from "../../context/AuthContext";
import { ACCOUNT_TYPES, AccountType } from "../../constants/accountTypes";
import { colors, radii } from "../../constants/theme";

export default function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("Individual");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const isOrg = accountType !== "Individual";

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        accountType
      );
      if (needsEmailConfirmation) {
        setNeedsConfirmation(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleSubmit = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed. Try again.");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  if (needsConfirmation) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>THE CIRCLE</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email.trim()}. Confirm it, then come back and log in.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.submitButton}>
              <Text style={styles.submitText}>Back to log in</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.eyebrow}>THE CIRCLE</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start building your verified Circle Score.</Text>

          <ChipSelect
            label="Account type"
            options={ACCOUNT_TYPES}
            value={accountType}
            onChange={(v) => setAccountType(v as AccountType)}
          />

          <AuthTextField
            label={isOrg ? "Organization name" : "Full name"}
            value={fullName}
            onChangeText={setFullName}
            textContentType="name"
            placeholder={isOrg ? "Acme Inc." : "Jane Doe"}
          />
          <AuthTextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />
          <AuthTextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            placeholder="At least 6 characters"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? "Creating account…" : "Sign up"}</Text>
          </Pressable>

          {!isOrg && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleSignInButton
                onPress={onGoogleSubmit}
                loading={googleSubmitting}
                label="Sign up with Google"
              />
            </>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Log in</Text>
              </Pressable>
            </Link>
          </View>
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
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentDark,
    letterSpacing: 1,
    marginBottom: 16,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 12,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accentDark,
  },
});
