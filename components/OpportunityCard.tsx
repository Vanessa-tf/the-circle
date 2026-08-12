import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radii } from "../constants/theme";

type Props = {
  title: string;
  subtitle: string;
  verified?: boolean;
  metricLabel: string;
  metricValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  secondaryValueAccent?: boolean;
  actionLabel?: string;
  buttonVariant?: "dark" | "accent";
  onPress?: () => void;
  applied?: boolean;
  eligibilityText?: string;
  eligibilityAccent?: boolean;
};

export default function OpportunityCard({
  title,
  subtitle,
  verified = true,
  metricLabel,
  metricValue,
  secondaryLabel,
  secondaryValue,
  secondaryValueAccent = false,
  actionLabel = "Apply",
  buttonVariant = "dark",
  onPress,
  applied = false,
  eligibilityText,
  eligibilityAccent = false,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {verified && (
          <View style={styles.verifiedPill}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        )}
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.footerRow}>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{metricLabel}</Text>
            <Text style={styles.metricValue}>{metricValue}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>{secondaryLabel}</Text>
            <Text style={[styles.metricValue, secondaryValueAccent && styles.metricValueAccent]}>
              {secondaryValue}
            </Text>
          </View>
        </View>

        <View style={styles.actionCol}>
          {eligibilityText && (
            <Text style={[styles.eligibilityText, eligibilityAccent && styles.eligibilityTextAccent]}>
              {eligibilityText}
            </Text>
          )}
          {applied ? (
            <View style={styles.appliedPill}>
              <Text style={styles.appliedText}>✓ Applied</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.applyButton, buttonVariant === "accent" && styles.applyButtonAccent]}
              onPress={onPress}
            >
              <Text style={styles.applyText}>{actionLabel}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 18,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
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
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 18,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  metrics: {
    flexDirection: "row",
    gap: 28,
  },
  metric: {},
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  metricValueAccent: {
    color: colors.accentDark,
  },
  actionCol: {
    alignItems: "flex-end",
  },
  eligibilityText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 6,
  },
  eligibilityTextAccent: {
    color: colors.accentDark,
  },
  applyButton: {
    backgroundColor: colors.dark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  applyButtonAccent: {
    backgroundColor: colors.accentDark,
  },
  applyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  appliedPill: {
    backgroundColor: colors.iconBgGray,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  appliedText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
