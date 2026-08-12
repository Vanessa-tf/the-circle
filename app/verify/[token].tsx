import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { colors, radii } from "../../constants/theme";

type ClaimDetails = {
  title: string;
  skill_category: string;
  points: number;
  org: string;
  verified_by: string;
  status: "pending" | "approved" | "rejected";
  claimant_name: string | null;
};

type ViewState = "loading" | "not-found" | "ready" | "resolving" | "error";

export default function VerifyClaim() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [claim, setClaim] = useState<ClaimDetails | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    supabase
      .rpc("get_credit_claim", { p_token: token })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error || !data || data.length === 0) {
          setState("not-found");
          return;
        }
        setClaim(data[0]);
        setState("ready");
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const decide = async (approve: boolean) => {
    if (!token) return;
    setState("resolving");
    const { data, error } = await supabase.rpc("resolve_credit_claim", {
      p_token: token,
      p_approve: approve,
    });
    if (error || !data || data.length === 0) {
      setState("error");
      return;
    }
    setDecision(data[0].status as "approved" | "rejected");
    setState("ready");
  };

  const effectiveStatus = decision ?? claim?.status ?? "pending";
  const busy = state === "resolving";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>THE CIRCLE</Text>

        {state === "loading" && <ActivityIndicator color={colors.accentDark} />}

        {state === "not-found" && (
          <>
            <Text style={styles.title}>Link not found</Text>
            <Text style={styles.subtitle}>This verification link is invalid or has expired.</Text>
          </>
        )}

        {state === "error" && (
          <>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>Please try again in a moment.</Text>
          </>
        )}

        {claim && (state === "ready" || state === "resolving") && (
          <>
            {effectiveStatus === "pending" ? (
              <>
                <Text style={styles.title}>Verify this credit</Text>
                <Text style={styles.subtitle}>
                  {claim.claimant_name ?? "Someone"} is asking you to confirm this is true.
                </Text>

                <View style={styles.claimCard}>
                  <Text style={styles.claimTitle}>{claim.title}</Text>
                  <Text style={styles.claimMeta}>
                    {claim.org} · {claim.skill_category}
                  </Text>
                  <View style={styles.pointsPill}>
                    <Text style={styles.pointsText}>
                      +{claim.points} {claim.skill_category}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.approveButton, busy && styles.buttonDisabled]}
                  disabled={busy}
                  onPress={() => decide(true)}
                >
                  <Text style={styles.approveText}>{busy ? "Submitting…" : "Approve"}</Text>
                </Pressable>
                <Pressable
                  style={[styles.rejectButton, busy && styles.buttonDisabled]}
                  disabled={busy}
                  onPress={() => decide(false)}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>
                  {effectiveStatus === "approved" ? "Thanks — approved" : "Marked as not verified"}
                </Text>
                <Text style={styles.subtitle}>
                  {effectiveStatus === "approved"
                    ? `You've confirmed "${claim.title}" for ${claim.claimant_name ?? "them"}.`
                    : "You've let them know this couldn't be verified."}
                </Text>
              </>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  claimCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 24,
  },
  claimTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  claimMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  pointsPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentDark,
  },
  approveButton: {
    backgroundColor: colors.dark,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    marginBottom: 12,
  },
  approveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  rejectButton: {
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
