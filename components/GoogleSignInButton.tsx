import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../constants/theme";

type Props = {
  onPress: () => void;
  loading?: boolean;
  label?: string;
};

export default function GoogleSignInButton({ onPress, loading, label = "Continue with Google" }: Props) {
  return (
    <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={onPress} disabled={loading}>
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <>
          <Ionicons name="logo-google" size={18} color={colors.textPrimary} style={styles.icon} />
          <Text style={styles.text}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 15,
    borderRadius: radii.pill,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
