import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "../lib/supabase";
import { AccountType } from "../constants/accountTypes";

WebBrowser.maybeCompleteAuthSession();

async function parseSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token, type } = params;
  if (!access_token || !refresh_token) return null;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return { session: data.session, isRecovery: type === "recovery" };
}

export type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  avatar_url: string | null;
  portfolio_url: string | null;
  account_type: AccountType;
  phone_verified: boolean;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    accountType?: AccountType
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  uploadAvatar: (uri: string, contentType: string) => Promise<void>;
  startPhoneVerification: (phone: string) => Promise<void>;
  confirmPhoneVerification: (phone: string, token: string) => Promise<void>;
  getAuthProviders: (email: string) => Promise<string[]>;
  requestPasswordReset: (email: string) => Promise<void>;
  isPasswordRecovery: boolean;
  completePasswordRecovery: (newPassword: string) => Promise<void>;
  cancelPasswordRecovery: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, location, avatar_url, portfolio_url, account_type, phone_verified")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("Failed to fetch profile:", error.message);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session) {
        setProfileLoading(true);
        const p = await fetchProfile(data.session.user.id);
        if (isMounted) {
          setProfile(p);
          setProfileLoading(false);
        }
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (newSession) {
        setProfileLoading(true);
        fetchProfile(newSession.user.id).then((p) => {
          if (!isMounted) return;
          setProfile(p);
          setProfileLoading(false);
        });
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleUrl = (url: string) => {
      parseSessionFromUrl(url)
        .then((result) => {
          if (result?.isRecovery) setIsPasswordRecovery(true);
        })
        .catch((e) => console.warn("Failed to create session from redirect URL:", e));
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    accountType: AccountType = "Individual"
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, account_type: accountType } },
    });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const redirectTo = makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error("Google sign-in did not return a URL.");

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === "success" && res.url) {
      await parseSessionFromUrl(res.url);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (!session) return;
    setProfile(await fetchProfile(session.user.id));
  };

  const uploadAvatar = async (uri: string, contentType: string) => {
    if (!session) throw new Error("Not signed in");

    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = contentType.split("/")[1] ?? "jpg";
    const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", session.user.id);
    if (updateError) throw updateError;

    await refreshProfile();
  };

  const startPhoneVerification = async (phone: string) => {
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) throw error;
  };

  const confirmPhoneVerification = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "phone_change" });
    if (error) throw error;
    await refreshProfile();
  };

  const getAuthProviders = async (email: string) => {
    const { data, error } = await supabase.rpc("get_auth_providers", { p_email: email });
    if (error) throw error;
    return (data ?? []) as string[];
  };

  const requestPasswordReset = async (email: string) => {
    const redirectTo = makeRedirectUri({ path: "reset-password" });
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const completePasswordRecovery = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setIsPasswordRecovery(false);
  };

  const cancelPasswordRecovery = async () => {
    setIsPasswordRecovery(false);
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        profileLoading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        uploadAvatar,
        startPhoneVerification,
        confirmPhoneVerification,
        getAuthProviders,
        requestPasswordReset,
        isPasswordRecovery,
        completePasswordRecovery,
        cancelPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
