import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { getInitials } from "../lib/initials";
import { colors } from "../constants/theme";

type Props = {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size: number;
};

export default function Avatar({ name, avatarUrl, size }: Props) {
  const circleStyle = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[styles.image, circleStyle]} />;
  }

  return (
    <View style={[styles.fallback, circleStyle]}>
      <Text style={[styles.text, { fontSize: size * 0.32 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.iconBgGray,
  },
  fallback: {
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "700",
  },
});
