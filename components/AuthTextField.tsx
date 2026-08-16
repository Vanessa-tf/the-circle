import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../constants/theme";

type Props = TextInputProps & {
  label: string;
};

export default function AuthTextField({ label, style, secureTextEntry, ...rest }: Props) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isPassword && styles.inputWithIcon, style]}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isPassword && !revealed}
          {...rest}
        />
        {isPassword && (
          <Pressable
            style={styles.eyeButton}
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
          >
            <Feather name={revealed ? "eye-off" : "eye"} size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputRow: {
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputWithIcon: {
    paddingRight: 46,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
  },
});
