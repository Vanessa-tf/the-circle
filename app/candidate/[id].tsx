import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import SkillPill from "../../components/SkillPill";
import ProjectItem from "../../components/ProjectItem";
import { supabase } from "../../lib/supabase";
import { SKILL_CATEGORIES, SkillCategory, weightedPoints } from "../../constants/scoring";
import { getInitials } from "../../lib/initials";
import { formatShortDate } from "../../lib/formatDate";
import { colors, radii } from "../../constants/theme";

type CandidateProfile = {
  full_name: string | null;
  role: string | null;
  location: string | null;
};

type CandidateCredit = {
  id: string;
  title: string;
  skill_category: SkillCategory;
  points: number;
  verified_by: string;
  awarded_at: string;
  verifier_weight: number;
  consistency_factor: number;
};

export default function CandidateProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [credits, setCredits] = useState<CandidateCredit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    Promise.all([
      supabase.from("profiles").select("full_name, role, location").eq("id", id).single(),
      supabase
        .from("credits")
        .select("id, title, skill_category, points, verified_by, awarded_at, verifier_weight, consistency_factor")
        .eq("user_id", id)
        .order("awarded_at", { ascending: false }),
    ]).then(([profileRes, creditsRes]) => {
      if (!isMounted) return;
      setProfile(profileRes.data ?? null);
      setCredits((creditsRes.data ?? []) as CandidateCredit[]);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const skillTotals = SKILL_CATEGORIES.reduce((acc, category) => {
    acc[category] = Math.round(
      credits
        .filter((c) => c.skill_category === category)
        .reduce((sum, c) => sum + weightedPoints(c), 0)
    );
    return acc;
  }, {} as Record<SkillCategory, number>);

  const totalScore = Object.values(skillTotals).reduce((sum, v) => sum + v, 0);

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
        ) : (
          <>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>
              </View>
              <Text style={styles.name}>{profile?.full_name || "Circle member"}</Text>
              <Text style={styles.role}>
                {[profile?.role, profile?.location].filter(Boolean).join(" · ") || "No details yet"}
              </Text>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValueAccent}>{totalScore}</Text>
                <Text style={styles.statLabel}>CIRCLE SCORE</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{credits.length}</Text>
                <Text style={styles.statLabel}>VERIFICATIONS</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsRow}>
              {SKILL_CATEGORIES.map((category) => (
                <SkillPill key={category} name={category} count={skillTotals[category]} />
              ))}
            </View>

            <Text style={styles.sectionTitle}>Verified projects</Text>
            {credits.length === 0 && <Text style={styles.emptyText}>No verified credits yet.</Text>}
            {credits.map((c) => (
              <ProjectItem
                key={c.id}
                title={c.title}
                subtitle={`+${Math.round(weightedPoints(c))} pts · ${c.verified_by} · ${formatShortDate(c.awarded_at)}`}
              />
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
  identity: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: colors.textSecondary,
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
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  statValueAccent: {
    fontSize: 24,
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
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
});
