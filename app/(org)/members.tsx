import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAffiliations } from "../../context/AffiliationsContext";
import { colors, radii } from "../../constants/theme";

export default function Members() {
  const { incomingAffiliations, resolveAffiliation } = useAffiliations();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const pending = incomingAffiliations.filter((a) => a.status === "pending");
  const roster = incomingAffiliations.filter((a) => a.status === "approved");

  const onResolve = async (id: string, approve: boolean) => {
    setResolvingId(id);
    try {
      await resolveAffiliation(id, approve);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Members</Text>
        <Text style={styles.subtitle}>People formally linked to your organization</Text>

        {pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Requests</Text>
            {pending.map((a) => (
              <View key={a.id} style={styles.card}>
                <Text style={styles.name}>{a.individual_name ?? "Someone"}</Text>
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
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Roster</Text>
        {roster.length === 0 && <Text style={styles.emptyText}>No members yet.</Text>}
        {roster.map((a) => (
          <Pressable
            key={a.id}
            style={styles.card}
            onPress={() => router.push(`/candidate/${a.individual_id}`)}
          >
            <Text style={styles.name}>{a.individual_name ?? "Someone"}</Text>
            <Text style={styles.meta}>View profile</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 14,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
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
