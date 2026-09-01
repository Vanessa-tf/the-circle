import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthTextField from "../components/AuthTextField";
import Avatar from "../components/Avatar";
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
  const { session, profile, refreshProfile, uploadAvatar, startPhoneVerification, confirmPhoneVerification } =
    useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [role, setRole] = useState(profile?.role ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const draftLoaded = useRef(false);

  const onPickAvatar = async () => {
    setAvatarError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError("Photo library access is needed to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      await uploadAvatar(asset.uri, asset.mimeType ?? "image/jpeg");
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Couldn't upload that photo. Try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);

  const onSendCode = async () => {
    setPhoneError(null);
    setPhoneBusy(true);
    try {
      await startPhoneVerification(phone.trim());
      setCodeSent(true);
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : "Couldn't send a code. Try again.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const onVerifyCode = async () => {
    setPhoneError(null);
    setPhoneBusy(true);
    try {
      await confirmPhoneVerification(phone.trim(), code.trim());
      setCodeSent(false);
      setPhone("");
      setCode("");
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : "That code didn't work. Try again.");
    } finally {
      setPhoneBusy(false);
    }
  };

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
          <View style={styles.avatarSection}>
            <Pressable onPress={onPickAvatar} disabled={avatarUploading}>
              <Avatar name={profile?.full_name} avatarUrl={profile?.avatar_url} size={88} />
              <View style={styles.avatarEditBadge}>
                <Feather name="camera" size={14} color="#fff" />
              </View>
            </Pressable>
            <Pressable onPress={onPickAvatar} disabled={avatarUploading}>
              <Text style={styles.avatarChangeText}>
                {avatarUploading ? "Uploading…" : "Change photo"}
              </Text>
            </Pressable>
            {avatarError && <Text style={styles.error}>{avatarError}</Text>}
          </View>

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

          <Text style={styles.sectionLabel}>Phone number</Text>
          {profile?.phone_verified && !codeSent ? (
            <View style={styles.verifiedRow}>
              <Feather name="check-circle" size={16} color={colors.accentDark} />
              <Text style={styles.verifiedRowText}>Phone verified</Text>
              <Pressable onPress={() => setCodeSent(false)}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          ) : !codeSent ? (
            <>
              <AuthTextField
                label="Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+1 415 555 1234"
              />
              {phoneError && <Text style={styles.error}>{phoneError}</Text>}
              <Pressable
                style={[styles.secondaryButton, (phoneBusy || !phone.trim()) && styles.saveButtonDisabled]}
                onPress={onSendCode}
                disabled={phoneBusy || !phone.trim()}
              >
                <Text style={styles.secondaryButtonText}>{phoneBusy ? "Sending…" : "Send code"}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <AuthTextField
                label={`Code sent to ${phone.trim()}`}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="123456"
              />
              {phoneError && <Text style={styles.error}>{phoneError}</Text>}
              <Pressable
                style={[styles.secondaryButton, (phoneBusy || !code.trim()) && styles.saveButtonDisabled]}
                onPress={onVerifyCode}
                disabled={phoneBusy || !code.trim()}
              >
                <Text style={styles.secondaryButtonText}>{phoneBusy ? "Verifying…" : "Verify"}</Text>
              </Pressable>
              <Pressable onPress={() => setCodeSent(false)}>
                <Text style={styles.changeLink}>Use a different number</Text>
              </Pressable>
            </>
          )}

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
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarChangeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentDark,
    marginTop: 10,
  },
  error: {
    fontSize: 13,
    color: "#D9534F",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
  },
  verifiedRowText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  changeLink: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentDark,
    marginBottom: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
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
