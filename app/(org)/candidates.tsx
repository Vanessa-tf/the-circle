import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import FilterPills from "../../components/FilterPills";
import AuthTextField from "../../components/AuthTextField";
import SkillPill from "../../components/SkillPill";
import { useCandidates } from "../../context/CandidatesContext";
import { SKILL_CATEGORIES, SkillCategory } from "../../constants/scoring";
import { getInitials } from "../../lib/initials";
import { colors, radii } from "../../constants/theme";

const CATEGORY_FILTERS = ["All", ...SKILL_CATEGORIES];

export default function Candidates() {
  const { candidates } = useCandidates();
  const [category, setCategory] = useState("All");
  const [minScore, setMinScore] = useState("");

  const results = useMemo(() => {
    const min = Number(minScore) || 0;
    return candidates
      .map((c) => ({
        ...c,
        relevantScore: category === "All" ? c.totalScore : c.skillTotals[category as SkillCategory],
      }))
      .filter((c) => c.relevantScore >= min)
      .sort((a, b) => b.relevantScore - a.relevantScore);
  }, [candidates, category, minScore]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Candidates</Text>
        <Text style={styles.subtitle}>Search by verified credit profile</Text>

        <FilterPills options={CATEGORY_FILTERS} value={category} onChange={setCategory} />

        <AuthTextField
          label={category === "All" ? "Minimum Circle Score" : `Minimum ${category} credits`}
          value={minScore}
          onChangeText={setMinScore}
          keyboardType="numeric"
          placeholder="0"
        />

        {results.length === 0 && <Text style={styles.emptyText}>No candidates match yet.</Text>}

        {results.map((c) => (
          <Pressable
            key={c.id}
            style={styles.card}
            onPress={() => router.push(`/candidate/${c.id}`)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(c.full_name)}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{c.full_name || "Circle member"}</Text>
              <Text style={styles.meta}>
                {[c.role, c.location].filter(Boolean).join(" · ") || "No details yet"}
              </Text>
              <View style={styles.skillRow}>
                <SkillPill name={category === "All" ? "Circle Score" : category} count={c.relevantScore} />
              </View>
            </View>
          </Pressable>
        ))}
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
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
  },
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  skillRow: {
    flexDirection: "row",
  },
});
