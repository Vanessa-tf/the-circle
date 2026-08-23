import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { colors, radii } from "../constants/theme";
import TaskItem from "./TaskItem";
import JobMatchCard from "./JobMatchCard";
import { useListings } from "../context/ListingsContext";
import { useCredits } from "../context/CreditsContext";
import { useClaims } from "../context/ClaimsContext";
import { useAuth } from "../context/AuthContext";

export default function JobSearchSection() {
  const { listingsByCategory, isApplied } = useListings();
  const { totalScore } = useCredits();
  const { claims } = useClaims();
  const { profile } = useAuth();

  const jobListings = (listingsByCategory.Jobs ?? []).filter((l) => l.status === "open");
  const matches = jobListings
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      subtitle: listing.subtitle,
      score: listing.metric_value,
      matchPercent: listing.score_required
        ? Math.min(100, Math.round((totalScore / listing.score_required) * 100))
        : 0,
    }))
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, 3);

  const appliedJobsCount = jobListings.filter((l) => isApplied(l.id)).length;
  const avgRequired = jobListings.length
    ? Math.round(
        jobListings.reduce((sum, l) => sum + (l.score_required ?? 0), 0) / jobListings.length
      )
    : 0;
  const topMatchPercent = matches.length ? matches[0].matchPercent : null;

  const heroStats = [
    { value: String(appliedJobsCount), label: "APPLIED" },
    { value: topMatchPercent !== null ? `${topMatchPercent}%` : "—", label: "TOP MATCH" },
    { value: `${avgRequired}+`, label: "AVG REQUIRED" },
  ];

  const tasks: {
    title: string;
    subtitle: string;
    badgeLabel: string;
    badgeVariant: "reward" | "action";
    onPress: () => void;
  }[] = [];

  if (!profile?.portfolio_url) {
    tasks.push({
      title: "Add portfolio link to your profile",
      subtitle: "Recruiters check this first",
      badgeLabel: "Add link",
      badgeVariant: "action",
      onPress: () => router.push("/edit-profile"),
    });
  }

  for (const claim of claims) {
    if (claim.status !== "pending") continue;
    tasks.push({
      title: `Get your ${claim.title} verified`,
      subtitle: `${claim.verified_by} pending`,
      badgeLabel: `+${claim.points} ${claim.skill_category}`,
      badgeVariant: "reward",
      onPress: () => router.push("/(tabs)/credits"),
    });
  }

  return (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>JOB SEARCH</Text>
        <Text style={styles.heroTitle}>
          <Text style={styles.heroHighlight}>{jobListings.length} jobs</Text> match your Circle
          Score of {totalScore}
        </Text>
        <View style={styles.heroStatsRow}>
          {heroStats.map((s) => (
            <View key={s.label} style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{s.value}</Text>
              <Text style={styles.heroStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tasks to boost your match</Text>
        <Text style={styles.sectionMeta}>{tasks.length} open</Text>
      </View>

      {tasks.length === 0 ? (
        <Text style={styles.emptyText}>You're all caught up here.</Text>
      ) : (
        tasks.map((task) => <TaskItem key={task.title} done={false} {...task} />)
      )}

      <View style={[styles.sectionHeader, styles.matchesHeader]}>
        <Text style={styles.sectionTitle}>Top matches for you</Text>
        <Pressable onPress={() => router.push({ pathname: "/(tabs)/explore", params: { filter: "Jobs" } })}>
          <Text style={styles.seeAll}>See all {jobListings.length}</Text>
        </Pressable>
      </View>

      {matches.length === 0 && (
        <Text style={styles.emptyText}>
          No job matches yet — keep earning verified credits to unlock more roles.
        </Text>
      )}

      {matches.map((job) => (
        <JobMatchCard
          key={job.id}
          {...job}
          applied={isApplied(job.id)}
          onApply={() => router.push(`/apply-listing?listingId=${job.id}`)}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.dark,
    borderRadius: radii.lg,
    padding: 20,
    marginBottom: 24,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    lineHeight: 24,
    marginBottom: 20,
  },
  heroHighlight: {
    fontWeight: "700",
    color: colors.lime,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 28,
  },
  heroStatItem: {},
  heroStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  matchesHeader: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sectionMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 24,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentDark,
  },
});
