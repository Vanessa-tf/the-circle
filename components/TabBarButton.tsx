import React from "react";
import { Pressable, StyleSheet } from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import TabIcon from "./TabIcon";

type Props = BottomTabBarButtonProps & {
  iconName: React.ComponentProps<typeof Feather>["name"];
  label: string;
};

export default function TabBarButton({
  iconName,
  label,
  onPress,
  onLongPress,
  style,
  ...rest
}: Props) {
  const focused = !!(rest as { "aria-selected"?: boolean })["aria-selected"];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[style, styles.button]}
      android_ripple={null}
    >
      <TabIcon name={iconName} label={label} focused={focused} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
