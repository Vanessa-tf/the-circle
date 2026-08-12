import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import FilterPills from "../../components/FilterPills";
import OpportunityCard from "../../components/OpportunityCard";
import { useListings, Listing } from "../../context/ListingsContext";
import { useCredits } from "../../context/CreditsContext";
import { useTasks } from "../../context/TasksContext";
import { SkillCategory } from "../../constants/scoring";
import { colors } from "../../constants/theme";

const filters = ["Tasks", "Jobs", "Freelance", "Investors", "Startups", "Mentors"];

function getEligibility(
  listing: Listing,
  totalScore: number,
  skillTotals: Record<SkillCategory, number>
): { text: string; accent: boolean } | undefined {
  if (listing.score_required == null) return undefined;

  const current = listing.score_required_category
    ? skillTotals[listing.score_required_category]
    : totalScore;
  const label = listing.score_required_category ?? "Circle Score";

  if (current >= listing.score_required) {
    return { text: "✓ You qualify", accent: true };
  }
  return { text: `Need ${listing.score_required - current} more ${label} pts`, accent: false };
}

export default function Explore() {
  const [filter, setFilter] = useState("Tasks");
  const { listingsByCategory, isApplied, apply } = useListings();
  const { totalScore, skillTotals } = useCredits();
  const { tasks, mySubmissions } = useTasks();

  const visibleListings = listingsByCategory[filter] ?? [];
  const submittedTaskIds = new Set(mySubmissions.map((s) => s.task_id));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.roundButton}>
            <Feather name="more-horizontal" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Opportunities matched to your Circle Score</Text>

        <FilterPills options={filters} value={filter} onChange={setFilter} />

        {filter === "Tasks" &&
          tasks.map((task) => (
            <OpportunityCard
              key={task.id}
              title={task.title}
              subtitle={task.description}
              verified
              metricLabel="POINTS"
              metricValue={`+${task.points}`}
              secondaryLabel="CATEGORY"
              secondaryValue={task.skill_category}
              actionLabel="Submit work"
              applied={submittedTaskIds.has(task.id)}
              onPress={() => router.push(`/submit-task?taskId=${task.id}`)}
            />
          ))}

        {filter !== "Tasks" &&
          visibleListings.map((listing) => {
            const eligibility = getEligibility(listing, totalScore, skillTotals);
            return (
              <OpportunityCard
                key={listing.id}
                title={listing.title}
                subtitle={listing.subtitle}
                verified={listing.verified}
                metricLabel={listing.metric_label}
                metricValue={listing.metric_value}
                secondaryLabel={listing.secondary_label}
                secondaryValue={listing.secondary_value}
                secondaryValueAccent={listing.secondary_value_accent}
                actionLabel={listing.action_label}
                buttonVariant={listing.button_variant}
                applied={isApplied(listing.id)}
                onPress={() => apply(listing.id)}
                eligibilityText={eligibility?.text}
                eligibilityAccent={eligibility?.accent}
              />
            );
          })}
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
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 20,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
});
