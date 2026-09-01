import React from "react";
import { View, Text, Image, Pressable, StyleSheet, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getInitials } from "../lib/initials";
import { colors, radii } from "../constants/theme";

type Props = {
  visible: boolean;
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  editable?: boolean;
  uploading?: boolean;
  onClose: () => void;
  onEdit?: () => void;
};

export default function AvatarViewerModal({
  visible,
  name,
  avatarUrl,
  editable = false,
  uploading = false,
  onClose,
  onEdit,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Feather name="x" size={22} color="#fff" />
        </Pressable>

        <View style={styles.imageWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.fallback}>
              <Text style={styles.fallbackText}>{getInitials(name)}</Text>
            </View>
          )}
        </View>

        {editable && (
          <Pressable style={styles.editButton} onPress={onEdit} disabled={uploading}>
            <Feather name="camera" size={16} color="#fff" />
            <Text style={styles.editText}>{uploading ? "Uploading…" : "Change photo"}</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  closeButton: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrap: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "#fff",
    fontSize: 64,
    fontWeight: "700",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.accentDark,
  },
  editText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
