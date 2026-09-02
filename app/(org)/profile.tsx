import React, { useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Avatar from "../../components/Avatar";
import AvatarViewerModal from "../../components/AvatarViewerModal";
import { useProfileImagePicker } from "../../hooks/useProfileImagePicker";
import { useAuth } from "../../context/AuthContext";
import { colors, radii } from "../../constants/theme";

export default function OrgProfile() {
  const { profile, signOut } = useAuth();
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
  const avatarPicker = useProfileImagePicker("avatar");
  const bannerPicker = useProfileImagePicker("banner");
  const industryLocation = [profile?.role, profile?.location].filter(Boolean).join(" · ");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerWrap}>
          <Pressable style={styles.banner} onPress={bannerPicker.pick} disabled={bannerPicker.uploading}>
            {profile?.banner_url ? (
              <Image source={{ uri: profile.banner_url }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerPlaceholder} />
            )}
            <View style={styles.bannerEditBadge}>
              <Feather name="camera" size={13} color="#fff" />
            </View>
          </Pressable>

          <View style={styles.headerRowOverlay}>
            <View />
            <Pressable style={styles.roundButton} onPress={() => signOut()}>
              <Feather name="log-out" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.identity}>
          <Pressable style={styles.avatarRing} onPress={() => setAvatarViewerVisible(true)}>
            <Avatar name={profile?.full_name} avatarUrl={profile?.avatar_url} size={88} />
          </Pressable>
          <Text style={styles.name}>{profile?.full_name || "Add your organization name"}</Text>
          <Text style={styles.role}>{industryLocation || profile?.account_type}</Text>

          <Pressable style={styles.editButton} onPress={() => router.push("/edit-profile")}>
            <Text style={styles.editButtonText}>Edit profile</Text>
          </Pressable>
        </View>
      </ScrollView>

      <AvatarViewerModal
        visible={avatarViewerVisible}
        name={profile?.full_name}
        avatarUrl={profile?.avatar_url}
        editable
        uploading={avatarPicker.uploading}
        onClose={() => setAvatarViewerVisible(false)}
        onEdit={avatarPicker.pick}
      />
      {avatarPicker.cropModal}
      {bannerPicker.cropModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  bannerWrap: {
    position: "relative",
    marginTop: 8,
  },
  banner: {
    width: "100%",
    aspectRatio: 3,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.iconBgGray,
  },
  bannerEditBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRowOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: -52,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
