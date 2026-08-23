import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../constants/theme";

type Props = {
  title: string;
  subtitle: string;
  matchPercent: number;
  score: string;
  verified?: boolean;
  applied?: boolean;
  onApply?: () => void;
};

export default function JobMatchCard({
  title,
  subtitle,
  matchPercent,
  score,
  verified = true,
  applied = false,
  onApply,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.matchPill}>
          <Text style={styles.matchText}>{matchPercent}% match</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.pillRow}>
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>Score {score}</Text>
        </View>
        {verified && (
          <View style={styles.verifiedPill}>
            <Feather name="check" size={11} color={colors.accentDark} />
            <Text style={styles.verifiedText}>Verified company</Text>
          </View>
        )}
      </View>
      {onApply && (
        <Pressable
          style={[styles.applyButton, applied && styles.applyButtonDisabled]}
          onPress={onApply}
          disabled={applied}
        >
          <Text style={[styles.applyText, applied && styles.applyTextDisabled]}>
            {applied ? "✓ Applied" : "Apply"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  matchPill: {
    backgroundColor: colors.matchBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  matchText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },
  scorePill: {
    backgroundColor: colors.iconBgGray,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accentDark,
  },
  applyButton: {
    marginTop: 12,
    backgroundColor: colors.dark,
    paddingVertical: 11,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  applyButtonDisabled: {
    backgroundColor: colors.iconBgGray,
  },
  applyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  applyTextDisabled: {
    color: colors.textSecondary,
  },
});
