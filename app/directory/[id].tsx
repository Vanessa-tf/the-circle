import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { colors, radii } from "../../constants/theme";

type DirectoryEntry = {
  id: string;
  name: string;
  industry: string;
  location: string;
  website: string | null;
  description: string;
  claimed_by: string | null;
};

export default function DirectoryProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [entry, setEntry] = useState<DirectoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrgAccount = profile?.account_type === "Company" || profile?.account_type === "Institution";

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    supabase
      .from("company_directory")
      .select("id, name, industry, location, website, description, claimed_by")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (isMounted) {
          setEntry(data);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const onClaim = async () => {
    if (!id) return;
    setError(null);
    setClaiming(true);
    try {
      const { data, error: claimError } = await supabase
        .from("company_directory")
        .update({ claimed_by: (await supabase.auth.getUser()).data.user?.id, claimed_at: new Date().toISOString() })
        .eq("id", id)
        .select("id, name, industry, location, website, description, claimed_by")
        .single();
      if (claimError) throw claimError;
      setEntry(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't claim this listing — it may have just been claimed by someone else."
      );
    } finally {
      setClaiming(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accentDark} />
        ) : !entry ? (
          <Text style={styles.emptyText}>Not found.</Text>
        ) : (
          <>
            <View style={styles.identity}>
              <View style={styles.logoCircle}>
                <Feather name="globe" size={32} color={colors.accentDark} />
              </View>
              <Text style={styles.name}>{entry.name}</Text>
              <Text style={styles.meta}>
                {entry.industry} · {entry.location}
              </Text>

              {entry.claimed_by ? (
                <View style={styles.claimedPill}>
                  <Feather name="check-circle" size={13} color={colors.accentDark} />
                  <Text style={styles.claimedText}>Claimed on The Circle</Text>
                </View>
              ) : (
                <View style={styles.unclaimedPill}>
                  <Text style={styles.unclaimedText}>Unclaimed listing</Text>
                </View>
              )}
            </View>

            <Text style={styles.description}>{entry.description}</Text>

            {entry.website && (
              <Pressable style={styles.websiteRow} onPress={() => Linking.openURL(entry.website!)}>
                <Feather name="external-link" size={14} color={colors.accentDark} />
                <Text style={styles.websiteText}>{entry.website.replace(/^https?:\/\//, "")}</Text>
              </Pressable>
            )}

            {!entry.claimed_by && (
              <View style={styles.claimSection}>
                <Text style={styles.claimTitle}>Is this your company?</Text>
                <Text style={styles.claimSubtitle}>
                  {isOrgAccount
                    ? "Claiming links this listing to your account so you can post real jobs, freelance gigs, and more under it."
                    : "Only a Company or Institution account can claim a listing. Sign up or switch accounts to claim this one."}
                </Text>
                {error && <Text style={styles.error}>{error}</Text>}
                <Pressable
                  style={[styles.claimButton, (!isOrgAccount || claiming) && styles.claimButtonDisabled]}
                  onPress={onClaim}
                  disabled={!isOrgAccount || claiming}
                >
                  <Text style={styles.claimButtonText}>{claiming ? "Claiming…" : "Claim this company"}</Text>
                </Pressable>
              </View>
            )}

            {entry.claimed_by && (
              <Pressable style={styles.viewProfileButton} onPress={() => router.push(`/org/${entry.claimed_by}`)}>
                <Text style={styles.viewProfileText}>View their profile</Text>
              </Pressable>
            )}
          </>
        )}
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
    marginTop: 8,
    marginBottom: 12,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  identity: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.iconBgGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: "center",
  },
  meta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  claimedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  claimedText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentDark,
  },
  unclaimedPill: {
    backgroundColor: colors.iconBgGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  unclaimedText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  websiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  websiteText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentDark,
  },
  claimSection: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 18,
  },
  claimTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  claimSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 19,
  },
  error: {
    fontSize: 13,
    color: "#D9534F",
    marginBottom: 12,
  },
  claimButton: {
    backgroundColor: colors.dark,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  claimButtonDisabled: {
    opacity: 0.5,
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  viewProfileButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
