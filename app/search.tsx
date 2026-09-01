import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AuthTextField from "../components/AuthTextField";
import FilterPills from "../components/FilterPills";
import Avatar from "../components/Avatar";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessagesContext";
import { colors, radii } from "../constants/theme";

const FILTERS = ["All", "People", "Companies", "Jobs", "Freelance", "Investors", "Startups", "Mentors"];
const LISTING_CATEGORIES = ["Jobs", "Freelance", "Investors", "Startups", "Mentors"];

type SearchResult = {
  id: string;
  kind: "person" | "org" | string;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
};

function sanitize(query: string) {
  // Strip characters that would break PostgREST's .or() filter syntax.
  return query.replace(/[,()]/g, " ").trim();
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const { session } = useAuth();
  const { startConversation } = useMessages();

  useEffect(() => {
    const q = sanitize(query);
    if (q.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      const wantsProfiles = filter === "All" || filter === "People" || filter === "Companies";
      const wantsListings = filter === "All" || LISTING_CATEGORIES.includes(filter);

      const queries: PromiseLike<{ data: any[] | null; error: any }>[] = [];

      if (wantsProfiles) {
        let profilesQuery = supabase
          .from("profiles")
          .select("id, full_name, role, location, avatar_url, account_type")
          .or(`full_name.ilike.%${q}%,role.ilike.%${q}%,location.ilike.%${q}%`)
          .limit(20);
        if (filter === "People") profilesQuery = profilesQuery.eq("account_type", "Individual");
        if (filter === "Companies") profilesQuery = profilesQuery.in("account_type", ["Company", "Institution"]);
        queries.push(profilesQuery);
      } else {
        queries.push(Promise.resolve({ data: [], error: null }));
      }

      if (wantsListings) {
        let listingsQuery = supabase
          .from("listings")
          .select("id, category, title, subtitle")
          .eq("status", "open")
          .or(`title.ilike.%${q}%,subtitle.ilike.%${q}%`)
          .limit(20);
        if (LISTING_CATEGORIES.includes(filter)) listingsQuery = listingsQuery.eq("category", filter);
        queries.push(listingsQuery);
      } else {
        queries.push(Promise.resolve({ data: [], error: null }));
      }

      const [profilesRes, listingsRes] = await Promise.all(queries);

      const people: SearchResult[] = (profilesRes.data ?? []).map((p) => ({
        id: p.id,
        kind: p.account_type === "Individual" ? "person" : "org",
        title: p.full_name || "Circle member",
        subtitle:
          p.account_type === "Individual"
            ? [p.role, p.location].filter(Boolean).join(" · ") || "No details yet"
            : [p.account_type, p.location].filter(Boolean).join(" · "),
        avatarUrl: p.avatar_url,
      }));

      const listings: SearchResult[] = (listingsRes.data ?? []).map((l) => ({
        id: l.id,
        kind: l.category,
        title: l.title,
        subtitle: `${l.category} · ${l.subtitle}`,
        avatarUrl: null,
      }));

      setResults([...people, ...listings]);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, filter]);

  const onResultPress = (result: SearchResult) => {
    if (result.kind === "person") {
      router.push(`/candidate/${result.id}`);
    } else if (result.kind === "org") {
      router.push(`/org/${result.id}`);
    } else if (result.kind === "Startups") {
      router.push(`/startup/${result.id}`);
    } else {
      router.push(`/apply-listing?listingId=${result.id}`);
    }
  };

  const onMessage = async (result: SearchResult) => {
    if (result.id === session?.user.id) return;
    setMessagingId(result.id);
    try {
      const conversationId = await startConversation(result.id);
      router.push(`/conversation?conversationId=${conversationId}`);
    } catch (e) {
      console.warn("Failed to start conversation:", e instanceof Error ? e.message : e);
    } finally {
      setMessagingId(null);
    }
  };

  const iconFor = (kind: string) => {
    switch (kind) {
      case "person":
        return "user";
      case "org":
        return "briefcase";
      case "Startups":
        return "trending-up";
      case "Mentors":
        return "message-circle";
      default:
        return "file-text";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.roundButton} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <AuthTextField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search people, companies, jobs…"
          autoCapitalize="none"
          autoFocus
        />
      </View>

      <FilterPills options={FILTERS} value={filter} onChange={setFilter} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color={colors.accentDark} style={styles.loading} />}

        {!loading && query.trim().length > 0 && results.length === 0 && (
          <Text style={styles.emptyText}>No results for "{query.trim()}".</Text>
        )}

        {!loading && query.trim().length === 0 && (
          <Text style={styles.emptyText}>Start typing to search people, companies, and listings.</Text>
        )}

        {!loading &&
          results.map((result) => (
            <Pressable
              key={`${result.kind}-${result.id}`}
              style={styles.resultCard}
              onPress={() => onResultPress(result)}
            >
              {result.kind === "person" || result.kind === "org" ? (
                <Avatar name={result.title} avatarUrl={result.avatarUrl} size={44} />
              ) : (
                <View style={styles.listingIcon}>
                  <Feather name={iconFor(result.kind) as any} size={18} color={colors.accentDark} />
                </View>
              )}
              <View style={styles.resultBody}>
                <Text style={styles.resultTitle}>{result.title}</Text>
                <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
              </View>
              {(result.kind === "person" || result.kind === "org") && result.id !== session?.user.id && (
                <Pressable
                  style={styles.messageIconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onMessage(result);
                  }}
                  disabled={messagingId === result.id}
                  hitSlop={8}
                >
                  <Feather
                    name="message-circle"
                    size={16}
                    color={messagingId === result.id ? colors.textMuted : colors.accentDark}
                  />
                </Pressable>
              )}
            </Pressable>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  loading: {
    marginTop: 24,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
  },
  listingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.iconBgGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBody: {
    flex: 1,
    marginLeft: 14,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 3,
  },
  resultSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  messageIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
