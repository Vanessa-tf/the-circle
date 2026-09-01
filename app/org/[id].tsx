import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Avatar from "../../components/Avatar";
import { supabase } from "../../lib/supabase";
import { colors, radii } from "../../constants/theme";

type OrgProfile = {
  full_name: string | null;
  role: string | null;
  location: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  account_type: string;
};

type OrgListing = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
};

export default function OrgProfileView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [listings, setListings] = useState<OrgListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    Promise.all([
      supabase
        .from("profiles")
        .select("full_name, role, location, avatar_url, banner_url, account_type")
        .eq("id", id)
        .single(),
      supabase
        .from("listings")
        .select("id, category, title, subtitle")
        .eq("owner_id", id)
        .eq("status", "open")
        .order("created_at", { ascending: false }),
    ]).then(([profileRes, listingsRes]) => {
      if (!isMounted) return;
      setProfile(profileRes.data ?? null);
      setListings((listingsRes.data ?? []) as OrgListing[]);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const onListingPress = (listing: OrgListing) => {
    if (listing.category === "Startups") {
      router.push(`/startup/${listing.id}`);
    } else {
      router.push(`/apply-listing?listingId=${listing.id}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <View style={styles.headerRow}>
              <Pressable style={styles.roundButton} onPress={() => router.back()}>
                <Feather name="chevron-left" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ActivityIndicator color={colors.accentDark} />
          </>
        ) : (
          <>
            {profile?.banner_url && <Image source={{ uri: profile.banner_url }} style={styles.banner} />}

            <View style={styles.headerRow}>
              <Pressable style={styles.roundButton} onPress={() => router.back()}>
                <Feather name="chevron-left" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.identity}>
              <View style={styles.avatarWrap}>
                <Avatar name={profile?.full_name} avatarUrl={profile?.avatar_url} size={88} />
              </View>
              <Text style={styles.name}>{profile?.full_name || "Unnamed organization"}</Text>
              <Text style={styles.role}>
                {[profile?.account_type, profile?.location].filter(Boolean).join(" · ")}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Open listings</Text>
            {listings.length === 0 && (
              <Text style={styles.emptyText}>Nothing open right now.</Text>
            )}
            {listings.map((listing) => (
              <Pressable
                key={listing.id}
                style={styles.listingCard}
                onPress={() => onListingPress(listing)}
              >
                <Text style={styles.listingTitle}>{listing.title}</Text>
                <Text style={styles.listingMeta}>
                  {listing.category} · {listing.subtitle}
                </Text>
              </Pressable>
            ))}
          </>
        )}
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
  banner: {
    width: "100%",
    aspectRatio: 3,
    borderRadius: radii.md,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: "row",
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
    marginBottom: 24,
  },
  avatarWrap: {
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  listingCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  listingMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
