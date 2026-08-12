import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../constants/theme";

type Props = {
  name: React.ComponentProps<typeof Feather>["name"];
  label: string;
  focused: boolean;
};

export default function TabIcon({ name, label, focused }: Props) {
  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <Feather name={name} size={20} color={focused ? colors.accentDark : colors.textMuted} />
      <Text
        style={[styles.label, focused && styles.labelFocused]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: radii.pill,
    maxWidth: "100%",
  },
  wrapFocused: {
    backgroundColor: colors.iconBgGreen,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
  labelFocused: {
    color: colors.accentDark,
  },
});
