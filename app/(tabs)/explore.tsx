import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import FilterPills from "../../components/FilterPills";
import OpportunityCard from "../../components/OpportunityCard";
import { useListings, Listing } from "../../context/ListingsContext";
import { useCredits } from "../../context/CreditsContext";
import { useTasks } from "../../context/TasksContext";
import { supabase } from "../../lib/supabase";
import { SkillCategory } from "../../constants/scoring";
import { colors } from "../../constants/theme";

type StartupStats = { team_score_avg: number; open_roles: number };

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
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState(
    initialFilter && filters.includes(initialFilter) ? initialFilter : "Tasks"
  );
  const { listingsByCategory, isApplied } = useListings();
  const { totalScore, skillTotals } = useCredits();
  const { tasks, mySubmissions } = useTasks();
  const [startupStats, setStartupStats] = useState<Record<string, StartupStats>>({});

  const visibleListings = (listingsByCategory[filter] ?? []).filter((l) => l.status === "open");
  const submittedTaskIds = new Set(mySubmissions.map((s) => s.task_id));
  const startupListings = (listingsByCategory.Startups ?? []).filter((l) => l.status === "open");

  useEffect(() => {
    if (startupListings.length === 0) return;
    let isMounted = true;
    const ownerIds = [...new Set(startupListings.map((l) => l.owner_id).filter(Boolean))] as string[];

    Promise.all(
      ownerIds.map((ownerId) =>
        supabase
          .rpc("get_startup_stats", { p_owner_id: ownerId })
          .then(({ data }) => [ownerId, data?.[0]] as const)
      )
    ).then((results) => {
      if (!isMounted) return;
      const next: Record<string, StartupStats> = {};
      for (const [ownerId, stats] of results) {
        if (stats) next[ownerId] = stats;
      }
      setStartupStats(next);
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startupListings.map((l) => l.id).join(",")]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.roundButton} onPress={() => router.push("/search")}>
            <Feather name="search" size={18} color={colors.textPrimary} />
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
            const isStartup = listing.category === "Startups";
            const stats = isStartup && listing.owner_id ? startupStats[listing.owner_id] : undefined;
            const metricValue = stats ? String(Math.round(stats.team_score_avg)) : listing.metric_value;
            const secondaryValue = stats ? String(stats.open_roles) : listing.secondary_value;
            return (
              <OpportunityCard
                key={listing.id}
                title={listing.title}
                subtitle={listing.subtitle}
                verified={listing.verified}
                metricLabel={listing.metric_label}
                metricValue={metricValue}
                secondaryLabel={listing.secondary_label}
                secondaryValue={secondaryValue}
                secondaryValueAccent={listing.secondary_value_accent}
                actionLabel={listing.action_label}
                buttonVariant={listing.button_variant}
                applied={!isStartup && isApplied(listing.id)}
                onPress={() =>
                  isStartup
                    ? router.push(`/startup/${listing.id}`)
                    : router.push(`/apply-listing?listingId=${listing.id}`)
                }
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
