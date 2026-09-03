import React from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { colors, radii } from "../constants/theme";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel} disabled={busy}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, destructive && styles.confirmButtonDestructive]}
              onPress={onConfirm}
              disabled={busy}
            >
              <Text style={styles.confirmText}>{busy ? "Working…" : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(18,24,43,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
    backgroundColor: colors.dark,
  },
  confirmButtonDestructive: {
    backgroundColor: "#D9534F",
  },
  confirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
