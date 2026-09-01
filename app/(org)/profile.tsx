import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Avatar from "../../components/Avatar";
import { useAuth } from "../../context/AuthContext";
import { colors, radii } from "../../constants/theme";

export default function OrgProfile() {
  const { profile, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View />
          <Pressable style={styles.roundButton} onPress={() => signOut()}>
            <Feather name="log-out" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            <Avatar name={profile?.full_name} avatarUrl={profile?.avatar_url} size={88} />
          </View>
          <Text style={styles.name}>{profile?.full_name || "Add your organization name"}</Text>
          <Text style={styles.role}>{profile?.account_type}</Text>

          <Pressable style={styles.editButton} onPress={() => router.push("/edit-profile")}>
            <Text style={styles.editButtonText}>Edit profile</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
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
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.accent,
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
