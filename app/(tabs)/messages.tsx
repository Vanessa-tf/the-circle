import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import ConversationItem from "../../components/ConversationItem";
import { useMessages } from "../../context/MessagesContext";
import { formatRelativeTime } from "../../lib/formatDate";
import { colors } from "../../constants/theme";

export default function Messages() {
  const { messages } = useMessages();

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

        {messages.length === 0 ? (
          <Text style={styles.emptyText}>
            No activity yet — apply to something or submit a verification to see updates here.
          </Text>
        ) : (
          messages.map((message) => (
            <ConversationItem
              key={message.id}
              initials={message.initials}
              avatarColor={message.avatarColor}
              name={message.senderName}
              time={formatRelativeTime(message.timestamp)}
              unread={message.unread}
              preview={message.preview}
              tag={message.tag}
              onPress={() => router.push(`/(tabs)/${message.target}`)}
            />
          ))
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
