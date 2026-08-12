import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../constants/theme";

type Props = {
  title: string;
  subtitle: string;
  matchPercent: number;
  score: string;
  verified?: boolean;
};

export default function JobMatchCard({
  title,
  subtitle,
  matchPercent,
  score,
  verified = true,
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
});
