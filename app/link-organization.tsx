import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import OpportunityCard from "../components/OpportunityCard";
import { useAffiliations } from "../context/AffiliationsContext";
import { supabase } from "../lib/supabase";
import { colors } from "../constants/theme";

type Org = {
  id: string;
  full_name: string | null;
  account_type: "Company" | "Institution";
};

export default function LinkOrganization() {
  const { myAffiliations, requestAffiliation } = useAffiliations();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, account_type")
      .in("account_type", ["Company", "Institution"])
      .then(({ data }) => {
        setOrgs((data ?? []) as Org[]);
        setLoading(false);
      });
  }, []);

  const statusByOrg = new Map(myAffiliations.map((a) => [a.org_id, a.status]));

  const onRequest = async (orgId: string) => {
    setError(null);
    setRequestingId(orgId);
    try {
      await requestAffiliation(orgId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Link an organization</Text>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Request a formal link with a company or institution — once approved, you'll show up on
          their roster.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {loading ? (
          <ActivityIndicator color={colors.accentDark} />
        ) : (
          orgs.map((org) => {
            const status = statusByOrg.get(org.id);
            return (
              <OpportunityCard
                key={org.id}
                title={org.full_name || "Unnamed organization"}
                subtitle={org.account_type}
                verified={false}
                metricLabel="TYPE"
                metricValue={org.account_type}
                secondaryLabel="STATUS"
                secondaryValue={status ? status : "Not linked"}
                secondaryValueAccent={status === "approved"}
                actionLabel={requestingId === org.id ? "Requesting…" : "Request link"}
                applied={!!status}
                onPress={() => onRequest(org.id)}
              />
            );
          })
        )}

        {!loading && orgs.length === 0 && (
          <Text style={styles.emptyText}>No companies or institutions on the platform yet.</Text>
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
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  error: {
    fontSize: 13,
    color: "#D9534F",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
