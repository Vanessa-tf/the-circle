import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useListings } from "../../../context/ListingsContext";
import { colors, radii } from "../../../constants/theme";

function goBack() {
  if (Platform.OS === "web") {
    window.location.href = "/(org)/listings";
  } else {
    router.replace("/(org)/listings");
  }
}

export default function ListingReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { myListings, incomingApplications, resolveApplication, closeListing } = useListings();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const listing = myListings.find((l) => l.id === id);
  const applications = incomingApplications.filter((a) => a.listing_id === id);

  const onResolve = async (applicationId: string, approve: boolean) => {
    setResolvingId(applicationId);
    try {
      await resolveApplication(applicationId, approve);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton} onPress={goBack}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          {listing?.status === "open" && (
            <Pressable style={styles.closeListingButton} onPress={() => closeListing(listing.id)}>
              <Text style={styles.closeListingText}>Close listing</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.title}>{listing?.title ?? "Listing"}</Text>
        {listing && (
          <Text style={styles.subtitle}>
            {listing.category} · {listing.status}
          </Text>
        )}

        <Text style={styles.sectionTitle}>Applications</Text>
        {applications.length === 0 && (
          <Text style={styles.emptyText}>No applications yet.</Text>
        )}

        {applications.map((a) => (
          <View key={a.id} style={styles.applicationCard}>
            <Text style={styles.applicantName}>{a.applicant_name ?? "Someone"}</Text>
            {a.answers.length > 0 ? (
              a.answers.map((qa, i) => (
                <View key={i} style={styles.qaBlock}>
                  <Text style={styles.question}>{qa.question}</Text>
                  <Text style={styles.answer}>{qa.answer}</Text>
                </View>
              ))
            ) : null}
            {a.note.length > 0 && <Text style={styles.note}>{a.note}</Text>}

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
                  onPress={() => onResolve(a.id, true)}
                >
                  <Text style={styles.approveText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.rejectButton, resolvingId === a.id && styles.buttonDisabled]}
                  disabled={resolvingId === a.id}
                  onPress={() => onResolve(a.id, false)}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.statusPill, a.status === "rejected" && styles.statusPillRejected]}>
                <Text
                  style={[styles.statusText, a.status === "rejected" && styles.statusTextRejected]}
                >
                  {a.status === "accepted" ? "Accepted" : "Rejected"}
                </Text>
              </View>
            )}
          </View>
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
    alignItems: "center",
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
  closeListingButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeListingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textTransform: "capitalize",
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
  applicationCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  note: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  qaBlock: {
    marginBottom: 10,
  },
  question: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 3,
  },
  answer: {
    fontSize: 13,
    color: colors.textSecondary,
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
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  statusPillRejected: {
    backgroundColor: colors.iconBgGray,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentDark,
  },
  statusTextRejected: {
    color: colors.textMuted,
  },
});
