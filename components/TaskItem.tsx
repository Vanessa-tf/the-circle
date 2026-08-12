import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../constants/theme";

type Props = {
  done: boolean;
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeVariant?: "reward" | "action";
};

export default function TaskItem({
  done,
  title,
  subtitle,
  badgeLabel,
  badgeVariant = "reward",
}: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
        {done && <Feather name="check" size={14} color="#fff" />}
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.badge, badgeVariant === "action" && styles.badgeAction]}>
        <Text style={[styles.badgeText, badgeVariant === "action" && styles.badgeTextAction]}>
          {badgeLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkCircleDone: {
    backgroundColor: colors.accentDark,
    borderColor: colors.accentDark,
  },
  body: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 3,
  },
  titleDone: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badge: {
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  badgeAction: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accentDark,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentDark,
  },
  badgeTextAction: {
    color: colors.accentDark,
  },
});
