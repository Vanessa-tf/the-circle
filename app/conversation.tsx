import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatRelativeTime } from "../lib/formatDate";
import { colors, radii } from "../constants/theme";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function Conversation() {
  const { applicationId, conversationId } = useLocalSearchParams<{
    applicationId?: string;
    conversationId?: string;
  }>();
  const { session } = useAuth();
  const [otherPartyName, setOtherPartyName] = useState<string>("");
  const [listingTitle, setListingTitle] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async () => {
    if (applicationId) {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Message[]);
    } else if (conversationId) {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Message[]);
    }
  }, [applicationId, conversationId]);

  useEffect(() => {
    let isMounted = true;
    if (!session || (!applicationId && !conversationId)) return;

    const setup = async () => {
      if (applicationId) {
        const { data } = await supabase
          .from("applications")
          .select("id, user_id, listing:listings(title, owner_id)")
          .eq("id", applicationId)
          .single();
        if (!isMounted || !data) return;
        const listing = data.listing as unknown as { title: string; owner_id: string | null } | null;
        setListingTitle(listing?.title ?? "");

        const iAmApplicant = data.user_id === session.user.id;
        const otherPartyId = iAmApplicant ? listing?.owner_id ?? null : data.user_id;

        if (otherPartyId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", otherPartyId)
            .single();
          if (isMounted) setOtherPartyName(profile?.full_name ?? "Conversation");
        }

        await loadMessages();
        await supabase.rpc("mark_messages_read", { p_application_id: applicationId });
      } else if (conversationId) {
        const { data } = await supabase
          .from("conversations")
          .select("user_a, user_b")
          .eq("id", conversationId)
          .single();
        if (!isMounted || !data) return;
        setListingTitle("");

        const otherPartyId = data.user_a === session.user.id ? data.user_b : data.user_a;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", otherPartyId)
          .single();
        if (isMounted) setOtherPartyName(profile?.full_name ?? "Conversation");

        await loadMessages();
        await supabase.rpc("mark_messages_read", { p_conversation_id: conversationId });
      }
      if (isMounted) setLoading(false);
    };

    setup();

    return () => {
      isMounted = false;
    };
  }, [applicationId, conversationId, session, loadMessages]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || !session || (!applicationId && !conversationId)) return;
    setSending(true);
    setDraft("");
    const { error } = await supabase.from("messages").insert(
      applicationId
        ? { application_id: applicationId, sender_id: session.user.id, body }
        : { conversation_id: conversationId, sender_id: session.user.id, body }
    );
    if (error) {
      console.warn("Failed to send message:", error.message);
    } else {
      await loadMessages();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
    setSending(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Pressable style={styles.roundButton} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerName}>{otherPartyName || "Conversation"}</Text>
          {listingTitle.length > 0 && <Text style={styles.headerSubtitle}>{listingTitle}</Text>}
        </View>
        <View style={styles.roundButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        {loading ? (
          <ActivityIndicator color={colors.accentDark} style={styles.loading} />
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 && (
              <Text style={styles.emptyText}>No messages yet — say hello.</Text>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === session?.user.id;
              return (
                <View
                  key={m.id}
                  style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
                >
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.body}</Text>
                  </View>
                  <Text style={styles.bubbleTime}>{formatRelativeTime(m.created_at)}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable
            style={[styles.sendButton, (draft.trim().length === 0 || sending) && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={draft.trim().length === 0 || sending}
          >
            <Feather name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
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
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    gap: 12,
  },
  roundButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loading: {
    marginTop: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 24,
  },
  bubbleRow: {
    marginBottom: 14,
    maxWidth: "80%",
  },
  bubbleRowMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubbleRowTheirs: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: colors.dark,
  },
  bubbleTheirs: {
    backgroundColor: colors.card,
  },
  bubbleText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  bubbleTextMine: {
    color: "#fff",
  },
  bubbleTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
