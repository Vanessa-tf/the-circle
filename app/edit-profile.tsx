import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthTextField from "../components/AuthTextField";
import Avatar from "../components/Avatar";
import AvatarViewerModal from "../components/AvatarViewerModal";
import { useProfileImagePicker } from "../hooks/useProfileImagePicker";
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
  const { session, profile, refreshProfile, startPhoneVerification, confirmPhoneVerification } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [role, setRole] = useState(profile?.role ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
  const draftLoaded = useRef(false);
  const avatarPicker = useProfileImagePicker("avatar");
  const bannerPicker = useProfileImagePicker("banner");

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

          <View style={styles.avatarSection}>
            <Pressable onPress={() => setAvatarViewerVisible(true)}>
              <Avatar name={profile?.full_name} avatarUrl={profile?.avatar_url} size={88} />
              <View style={styles.avatarEditBadge}>
                <Feather name="camera" size={14} color="#fff" />
              </View>
            </Pressable>
            <Pressable onPress={avatarPicker.pick} disabled={avatarPicker.uploading}>
              <Text style={styles.avatarChangeText}>
                {avatarPicker.uploading ? "Uploading…" : "Change photo"}
              </Text>
            </Pressable>
            {avatarPicker.error && <Text style={styles.error}>{avatarPicker.error}</Text>}
            {bannerPicker.error && <Text style={styles.error}>{bannerPicker.error}</Text>}
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
  banner: {
    width: "100%",
    aspectRatio: 3,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.card,
    marginBottom: 16,
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
