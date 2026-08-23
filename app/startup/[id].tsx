import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { colors, radii } from "../../constants/theme";

type StartupListing = {
  id: string;
  title: string;
  subtitle: string;
  owner_id: string | null;
};

type StartupStats = {
  team_score_avg: number;
  member_count: number;
  open_roles: number;
};

type OpenRole = {
  id: string;
  title: string;
  subtitle: string;
};

export default function StartupProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<StartupListing | null>(null);
  const [stats, setStats] = useState<StartupStats | null>(null);
  const [openRoles, setOpenRoles] = useState<OpenRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    supabase
      .from("listings")
      .select("id, title, subtitle, owner_id")
      .eq("id", id)
      .single()
      .then(async ({ data }) => {
        if (!isMounted) return;
        setListing(data ?? null);

        if (data?.owner_id) {
          const [statsRes, rolesRes] = await Promise.all([
            supabase.rpc("get_startup_stats", { p_owner_id: data.owner_id }),
            supabase
              .from("listings")
              .select("id, title, subtitle")
              .eq("owner_id", data.owner_id)
              .eq("category", "Jobs")
              .eq("status", "open"),
          ]);
          if (!isMounted) return;
          if (statsRes.data && statsRes.data.length > 0) setStats(statsRes.data[0]);
          setOpenRoles((rolesRes.data ?? []) as OpenRole[]);
        }

        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

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
        ) : !listing ? (
          <Text style={styles.emptyText}>Startup not found.</Text>
        ) : (
          <>
            <Text style={styles.name}>{listing.title}</Text>
            <Text style={styles.subtitle}>{listing.subtitle}</Text>

            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValueAccent}>{Math.round(stats?.team_score_avg ?? 0)}</Text>
                <Text style={styles.statLabel}>TEAM SCORE AVG</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.member_count ?? 0}</Text>
                <Text style={styles.statLabel}>TEAM MEMBERS</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.open_roles ?? 0}</Text>
                <Text style={styles.statLabel}>OPEN ROLES</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Open roles</Text>
            {openRoles.length === 0 && (
              <Text style={styles.emptyText}>No open roles right now.</Text>
            )}
            {openRoles.map((role) => (
              <Pressable
                key={role.id}
                style={styles.roleCard}
                onPress={() => router.push(`/apply-listing?listingId=${role.id}`)}
              >
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
              </Pressable>
            ))}
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
    marginBottom: 16,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  statValueAccent: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.accentDark,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  roleCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  roleSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
