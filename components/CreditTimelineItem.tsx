import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radii } from "../constants/theme";

type Props = {
  title: string;
  delta: string;
  verifiedBy: string;
  org: string;
  date: string;
};

export default function CreditTimelineItem({ title, delta, verifiedBy, org, date }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.delta}>{delta}</Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.verifiedPill}>
          <Text style={styles.verifiedText}>✓ {verifiedBy}</Text>
        </View>
        <Text style={styles.metaText}>
          {org} · {date}
        </Text>
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
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  delta: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accentDark,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  verifiedPill: {
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
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
