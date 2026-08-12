import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radii } from "../constants/theme";

type Props = {
  name: string;
  count: number;
};

export default function SkillPill({ name, count }: Props) {
  return (
    <View style={styles.pill}>
      <Text style={styles.name}>
        {name} <Text style={styles.count}>{count}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  count: {
    color: colors.accentDark,
    fontWeight: "700",
  },
});
