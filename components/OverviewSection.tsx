import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import CircularProgress from "./CircularProgress";
import StatCard from "./StatCard";
import ActivityItem from "./ActivityItem";
import PerformanceScroller from "./PerformanceScroller";
import { useCredits } from "../context/CreditsContext";
import { SKILL_CATEGORIES, SKILL_TARGET } from "../constants/scoring";
import { formatShortDate } from "../lib/formatDate";
import { colors, radii } from "../constants/theme";

const matchingStats = [
  {
    icon: "briefcase" as const,
    iconBg: colors.iconBgGreen,
    iconColor: colors.accentDark,
    value: "12",
    label: "Jobs match your score",
  },
  {
    icon: "monitor" as const,
    iconBg: colors.iconBgBlue,
    iconColor: "#3B82C4",
    value: "8",
    label: "Freelance projects open",
  },
  {
    icon: "tag" as const,
    iconBg: colors.iconBgYellow,
    iconColor: "#7A8C2E",
    value: "3",
    label: "Investors seeking founders",
  },
];

const HERO_SCORE_TARGET = SKILL_TARGET * SKILL_CATEGORIES.length;

export default function OverviewSection() {
  const { totalScore, skillTotals, thisWeekDelta, timelineCredits } = useCredits();

  const performance = SKILL_CATEGORIES.map((category) => ({
    label: category,
    progress: Math.min(1, skillTotals[category] / SKILL_TARGET),
    color: colors.accent,
  }));

  const recentActivity = timelineCredits.slice(0, 3).map((c) => ({
    title: c.title,
    subtitle: `${c.org} · ${formatShortDate(c.awarded_at)}`,
    delta: `+${c.points} ${c.skill_category}`,
  }));

  return (
    <>
      <View style={styles.heroCard}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroEyebrow}>THIS WEEK</Text>
          <Text style={styles.heroTitle}>Your credibility unlocked</Text>
          <Text style={styles.heroHighlight}>38 opportunities</Text>
          <Text style={styles.heroSubtitle}>Circle Score up +{thisWeekDelta} this week</Text>
        </View>
        <CircularProgress
          size={88}
          strokeWidth={7}
          progress={Math.min(1, totalScore / HERO_SCORE_TARGET)}
          color={colors.accent}
        >
          <Text style={styles.heroScore}>{totalScore}</Text>
        </CircularProgress>
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statRow}>
          <StatCard {...matchingStats[0]} />
          <StatCard {...matchingStats[1]} />
        </View>
        <View style={styles.statRow}>
          <StatCard {...matchingStats[2]} />
          <StatCard
            icon="bar-chart-2"
            iconBg={colors.iconBgGray}
            iconColor={colors.textSecondary}
            value={`+${thisWeekDelta}`}
            label="Score gained this week"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Performance overview</Text>

      <PerformanceScroller data={performance} />

      <View style={styles.activityHeader}>
        <Text style={styles.sectionTitle}>Latest verified activity</Text>
        <Pressable>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {recentActivity.map((item) => (
        <ActivityItem key={item.title} {...item} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.dark,
    borderRadius: radii.lg,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  heroHighlight: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.lime,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  heroScore: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  statGrid: {
    marginBottom: 24,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentDark,
    marginBottom: 16,
  },
});
