import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useListings } from "../../context/ListingsContext";
import { colors, radii } from "../../constants/theme";

export default function OrgListings() {
  const { myListings, incomingApplications } = useListings();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Listings</Text>
          <Pressable style={styles.addButton} onPress={() => router.push("/new-listing")}>
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        </View>

        {myListings.length === 0 && (
          <Text style={styles.emptyText}>You haven't posted any listings yet.</Text>
        )}

        {myListings.map((listing) => {
          const applicationCount = incomingApplications.filter(
            (a) => a.listing_id === listing.id
          ).length;
          return (
            <Pressable
              key={listing.id}
              style={styles.listingCard}
              onPress={() => router.push(`/(org)/listing/${listing.id}`)}
            >
              <View style={styles.listingHeaderRow}>
                <Text style={styles.listingTitle}>{listing.title}</Text>
                <View
                  style={[styles.statusPill, listing.status === "closed" && styles.statusPillClosed]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      listing.status === "closed" && styles.statusTextClosed,
                    ]}
                  >
                    {listing.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.listingMeta}>
                {listing.category} · {applicationCount} application
                {applicationCount === 1 ? "" : "s"}
              </Text>
            </Pressable>
          );
        })}
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
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
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
  listingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  listingTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginRight: 8,
  },
  listingMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusPill: {
    backgroundColor: colors.iconBgGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusPillClosed: {
    backgroundColor: colors.iconBgGray,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accentDark,
    textTransform: "capitalize",
  },
  statusTextClosed: {
    color: colors.textMuted,
  },
});
