import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radii } from "../constants/theme";

type Props = {
  title: string;
  subtitle: string;
};

export default function ProjectItem({ title, subtitle }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.verifiedPill}>
        <Text style={styles.verifiedText}>✓ Verified</Text>
      </View>
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
    padding: 16,
    marginBottom: 12,
  },
  body: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  verifiedPill: {
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accentDark,
  },
});
