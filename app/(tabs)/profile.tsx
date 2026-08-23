import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import ScoreLineChart from "../../components/ScoreLineChart";
import ActivityHeatmap from "../../components/ActivityHeatmap";
import SkillPill from "../../components/SkillPill";
import ProjectItem from "../../components/ProjectItem";
import ReliabilityCard, { FairnessSignals } from "../../components/ReliabilityCard";
import { useAuth } from "../../context/AuthContext";
import { useCredits } from "../../context/CreditsContext";
import { useAffiliations } from "../../context/AffiliationsContext";
import { useListings } from "../../context/ListingsContext";
import { supabase } from "../../lib/supabase";
import { SKILL_CATEGORIES, weightedPoints } from "../../constants/scoring";
import { getInitials } from "../../lib/initials";
import { formatShortDate } from "../../lib/formatDate";
import { colors, radii } from "../../constants/theme";

export default function Profile() {
  const { profile, session, signOut } = useAuth();
  const { totalScore, skillTotals, verificationsCount, scoreHistory, timelineCredits, credits } =
    useCredits();
  const { myAffiliations } = useAffiliations();
  const { myListings, incomingApplications, resolveApplication } = useListings();
  const [signals, setSignals] = useState<FairnessSignals | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const roleLocation = [profile?.role, profile?.location].filter(Boolean).join(" · ");

  const mentorListing = myListings.find((l) => l.category === "Mentors") ?? null;
  const bookingRequests = mentorListing
    ? incomingApplications.filter((a) => a.listing_id === mentorListing.id)
    : [];

  const onResolveBooking = async (applicationId: string, approve: boolean) => {
    setResolvingId(applicationId);
    try {
      await resolveApplication(applicationId, approve);
    } finally {
      setResolvingId(null);
    }
  };

  useEffect(() => {
    if (!session) return;
    supabase
      .rpc("get_fairness_signals", { p_user_id: session.user.id })
      .then(({ data }) => {
        if (data && data.length > 0) setSignals(data[0]);
      });
  }, [session]);

  const stats = [
    { value: String(totalScore), label: "CIRCLE SCORE", accent: true },
    { value: String(totalScore), label: "SKILL CREDITS", accent: false },
    { value: String(verificationsCount), label: "VERIFICATIONS", accent: false },
  ];

  const skills = SKILL_CATEGORIES.map((category) => ({
    name: category,
    count: skillTotals[category],
  }));

  const projects = timelineCredits.map((c) => ({
    id: c.id,
    title: c.title,
    subtitle: `+${Math.round(weightedPoints(c))} pts · ${c.verified_by} · ${formatShortDate(c.awarded_at)}`,
  }));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.roundButton} onPress={() => signOut()}>
            <Feather name="log-out" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>
            </View>
          </View>
          <Text style={styles.name}>{profile?.full_name || "Add your name"}</Text>
          <Text style={styles.role}>{roleLocation || "Add your role & location"}</Text>

          <Pressable style={styles.editButton} onPress={() => router.push("/edit-profile")}>
            <Text style={styles.editButtonText}>Edit profile</Text>
          </Pressable>

          {verificationsCount > 0 && (
            <View style={styles.badgeRow}>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified Professional</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, s.accent && styles.statValueAccent]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {signals && (
          <View style={styles.sectionSpacing}>
            <ReliabilityCard signals={signals} />
          </View>
        )}

        <Text style={styles.sectionTitle}>Score growth</Text>
        <View style={styles.sectionSpacing}>
          <ScoreLineChart data={scoreHistory} />
        </View>

        <Text style={styles.sectionTitle}>Activity heatmap</Text>
        <View style={styles.sectionSpacing}>
          <ActivityHeatmap dates={credits.map((c) => c.awarded_at)} />
        </View>

        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsRow}>
          {skills.map((skill) => (
            <SkillPill key={skill.name} {...skill} />
          ))}
        </View>

        <View style={styles.linkedRow}>
          <Text style={styles.sectionTitle}>Linked organizations</Text>
          <Pressable onPress={() => router.push("/link-organization")}>
            <Text style={styles.linkText}>+ Link one</Text>
          </Pressable>
        </View>
        {myAffiliations.length === 0 ? (
          <Text style={styles.emptyText}>Not linked to any organization yet.</Text>
        ) : (
          myAffiliations.map((a) => (
            <View key={a.id} style={styles.affiliationCard}>
              <Text style={styles.affiliationName}>{a.org_name || "Unnamed organization"}</Text>
              <View
                style={[
                  styles.affiliationPill,
                  a.status !== "approved" && styles.affiliationPillMuted,
                ]}
              >
                <Text
                  style={[
                    styles.affiliationPillText,
                    a.status !== "approved" && styles.affiliationPillTextMuted,
                  ]}
                >
                  {a.status === "approved" ? "Linked" : a.status === "pending" ? "Pending" : "Rejected"}
                </Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Mentorship</Text>
        {!mentorListing ? (
          <Pressable
            style={styles.mentorOptInCard}
            onPress={() => router.push("/new-listing")}
          >
            <Text style={styles.mentorOptInTitle}>Become a mentor</Text>
            <Text style={styles.mentorOptInSubtitle}>
              List a session so others can book time with you.
            </Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.affiliationCard}>
              <Text style={styles.affiliationName}>{mentorListing.title}</Text>
              <View style={[styles.affiliationPill, mentorListing.status === "closed" && styles.affiliationPillMuted]}>
                <Text
                  style={[
                    styles.affiliationPillText,
                    mentorListing.status === "closed" && styles.affiliationPillTextMuted,
                  ]}
                >
                  {mentorListing.status === "open" ? "Open" : "Closed"}
                </Text>
              </View>
            </View>

            {bookingRequests.length === 0 ? (
              <Text style={styles.emptyText}>No booking requests yet.</Text>
            ) : (
              bookingRequests.map((a) => (
                <View key={a.id} style={styles.bookingCard}>
                  <Text style={styles.affiliationName}>{a.applicant_name ?? "Someone"}</Text>
                  {a.answers.map((qa, i) => (
                    <View key={i} style={styles.qaBlock}>
                      <Text style={styles.question}>{qa.question}</Text>
                      <Text style={styles.bookingNote}>{qa.answer}</Text>
                    </View>
                  ))}
                  {a.note.length > 0 && <Text style={styles.bookingNote}>{a.note}</Text>}
                  <Pressable
                    style={styles.messageButton}
                    onPress={() => router.push(`/conversation?applicationId=${a.id}`)}
                  >
                    <Feather name="message-circle" size={13} color={colors.textPrimary} />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </Pressable>
                  {a.status === "applied" ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.approveButton, resolvingId === a.id && styles.buttonDisabled]}
                        disabled={resolvingId === a.id}
                        onPress={() => onResolveBooking(a.id, true)}
                      >
                        <Text style={styles.approveText}>Accept</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.rejectButton, resolvingId === a.id && styles.buttonDisabled]}
                        disabled={resolvingId === a.id}
                        onPress={() => onResolveBooking(a.id, false)}
                      >
                        <Text style={styles.rejectText}>Decline</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.affiliationPill,
                        a.status === "rejected" && styles.affiliationPillMuted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.affiliationPillText,
                          a.status === "rejected" && styles.affiliationPillTextMuted,
                        ]}
                      >
                        {a.status === "accepted" ? "Accepted" : "Declined"}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Verified projects</Text>
        {projects.map(({ id, ...project }) => (
          <ProjectItem key={id} {...project} />
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 14,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  verifiedBadge: {
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentDark,
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
    color: colors.accentDark,
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
  sectionSpacing: {
    marginBottom: 24,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  linkedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentDark,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 24,
  },
  affiliationCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  affiliationName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  affiliationPill: {
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  affiliationPillMuted: {
    backgroundColor: colors.iconBgGray,
  },
  affiliationPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accentDark,
  },
  affiliationPillTextMuted: {
    color: colors.textMuted,
  },
  mentorOptInCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  mentorOptInTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  mentorOptInSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  bookingNote: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 14,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  messageButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  qaBlock: {
    marginBottom: 4,
  },
  question: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 3,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.dark,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  approveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
