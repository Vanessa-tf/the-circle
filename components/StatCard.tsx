import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../constants/theme";

type Props = {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  onPress?: () => void;
};

export default function StatCard({ icon, iconBg, iconColor, value, label, onPress }: Props) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.card} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    minHeight: 118,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: colors.accentDark,
    lineHeight: 17,
  },
});
