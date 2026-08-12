import React from "react";
import { View, Text, StyleSheet, Pressable, Share } from "react-native";
import { colors, radii } from "../constants/theme";

type Props = {
  title: string;
  org: string;
  skillCategory: string;
  status: "pending" | "rejected";
  shareLink: string;
};

export default function PendingClaimItem({ title, org, skillCategory, status, shareLink }: Props) {
  const isPending = status === "pending";

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {org} · {skillCategory}
        </Text>
      </View>
      {isPending ? (
        <Pressable style={styles.shareButton} onPress={() => Share.share({ message: shareLink })}>
          <Text style={styles.shareText}>Share link</Text>
        </Pressable>
      ) : (
        <View style={styles.rejectedPill}>
          <Text style={styles.rejectedText}>Not verified</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
  },
  body: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  shareButton: {
    backgroundColor: colors.iconBgGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  shareText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  rejectedPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectedText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
