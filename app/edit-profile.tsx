import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthTextField from "../components/AuthTextField";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { colors, radii } from "../constants/theme";

function closeScreen() {
  if (Platform.OS === "web") {
    window.location.href = "/";
  } else {
    router.replace("/");
  }
}

type Draft = { fullName: string; role: string; location: string; portfolioUrl: string };

function draftKey(userId: string) {
  return `edit-profile-draft:${userId}`;
}

export default function EditProfile() {
  const { session, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [role, setRole] = useState(profile?.role ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draftLoaded = useRef(false);

  useEffect(() => {
    if (!session) return;
    AsyncStorage.getItem(draftKey(session.user.id)).then((raw) => {
      if (!raw) return;
      const draft: Draft = JSON.parse(raw);
      setFullName(draft.fullName);
      setRole(draft.role);
      setLocation(draft.location);
      setPortfolioUrl(draft.portfolioUrl);
    }).finally(() => {
      draftLoaded.current = true;
    });
  }, [session]);

  useEffect(() => {
    if (!session || !draftLoaded.current) return;
    const draft: Draft = { fullName, role, location, portfolioUrl };
    AsyncStorage.setItem(draftKey(session.user.id), JSON.stringify(draft));
  }, [session, fullName, role, location, portfolioUrl]);

  const onSave = async () => {
    if (!session) return;
    setError(null);
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          role: role.trim() || null,
          location: location.trim() || null,
          portfolio_url: portfolioUrl.trim() || null,
        })
        .eq("id", session.user.id);
      if (updateError) throw updateError;
      await AsyncStorage.removeItem(draftKey(session.user.id));
      await refreshProfile();
      closeScreen();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <Pressable style={styles.closeButton} onPress={closeScreen}>
          <Feather name="x" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AuthTextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholder="Jane Doe"
          />
          <AuthTextField
            label="Role"
            value={role}
            onChangeText={setRole}
            autoCapitalize="words"
            placeholder="e.g. Product Designer"
          />
          <AuthTextField
            label="Location"
            value={location}
            onChangeText={setLocation}
            autoCapitalize="words"
            placeholder="e.g. Nairobi"
          />
          <AuthTextField
            label="Portfolio link"
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            keyboardType="url"
            placeholder="https://your-portfolio.com"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? "Saving…" : "Save changes"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  error: {
    fontSize: 13,
    color: "#D9534F",
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: colors.dark,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
