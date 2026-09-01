import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import ConversationItem from "./ConversationItem";
import { useMessages } from "../context/MessagesContext";
import { formatRelativeTime } from "../lib/formatDate";
import { colors } from "../constants/theme";

export default function MessagesScreen() {
  const { notifications, conversations } = useMessages();
  const isEmpty = notifications.length === 0 && conversations.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.roundButton}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.roundButton}>
            <Feather name="more-horizontal" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Conversations from verified opportunities</Text>

        {isEmpty ? (
          <Text style={styles.emptyText}>
            No activity yet — apply to something or submit a verification to see updates here.
          </Text>
        ) : (
          <>
            {conversations.length > 0 && (
              <>
                {conversations.map((c) => (
                  <ConversationItem
                    key={`${c.threadType}-${c.threadId}`}
                    initials={c.initials}
                    avatarColor={c.avatarColor}
                    name={c.otherPartyName}
                    time={c.lastMessageAt ? formatRelativeTime(c.lastMessageAt) : ""}
                    unread={c.unreadCount > 0}
                    preview={c.lastMessage ?? "No messages yet — tap to start a conversation"}
                    tag={
                      c.listingCategory
                        ? `${c.listingCategory} · ${c.listingTitle}`
                        : c.listingTitle || "Direct message"
                    }
                    onPress={() =>
                      router.push(
                        c.threadType === "application"
                          ? `/conversation?applicationId=${c.threadId}`
                          : `/conversation?conversationId=${c.threadId}`
                      )
                    }
                  />
                ))}
              </>
            )}

            {notifications.map((n) => (
              <ConversationItem
                key={n.id}
                initials={n.initials}
                avatarColor={n.avatarColor}
                name={n.senderName}
                time={formatRelativeTime(n.timestamp)}
                unread={n.unread}
                preview={n.preview}
                tag={n.tag}
                onPress={() => router.push(`/(tabs)/${n.target}`)}
              />
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 20,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
