import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useListings } from "./ListingsContext";
import { getInitials } from "../lib/initials";
import { colors } from "../constants/theme";

export type MessageTarget = "credits" | "explore";

export type Notification = {
  id: string;
  senderName: string;
  initials: string;
  avatarColor: string;
  preview: string;
  tag: string;
  timestamp: string;
  unread: boolean;
  target: MessageTarget;
};

export type ThreadType = "application" | "direct";

export type Conversation = {
  threadId: string;
  threadType: ThreadType;
  otherPartyName: string;
  initials: string;
  avatarColor: string;
  listingTitle: string;
  listingCategory: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

type MessagesContextValue = {
  notifications: Notification[];
  conversations: Conversation[];
  loading: boolean;
  refresh: () => Promise<void>;
  startConversation: (otherUserId: string) => Promise<string>;
};

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

const UNREAD_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < UNREAD_WINDOW_MS;
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { myApplications, incomingApplications } = useListings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      return;
    }

    const { data, error } = await supabase
      .from("credit_claims")
      .select("id, title, skill_category, points, org, status, resolved_at")
      .eq("user_id", session.user.id)
      .neq("status", "pending");

    if (error) {
      console.warn("Failed to fetch claims for notifications:", error.message);
      setNotifications([]);
      return;
    }

    const items = (data ?? [])
      .filter((claim) => !!claim.resolved_at)
      .map((claim, index) => {
        const approved = claim.status === "approved";
        return {
          id: `claim-${claim.id}`,
          senderName: claim.org,
          initials: getInitials(claim.org),
          avatarColor: index % 2 === 0 ? colors.dark : colors.accentDark,
          preview: approved
            ? `${claim.title} verified — +${claim.points} ${claim.skill_category} credits released.`
            : `Your claim for "${claim.title}" could not be verified.`,
          tag: approved ? "Verification · Approved" : "Verification · Not verified",
          timestamp: claim.resolved_at as string,
          unread: isRecent(claim.resolved_at as string),
          target: "credits" as MessageTarget,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setNotifications(items);
  }, [session]);

  const fetchConversations = useCallback(async () => {
    if (!session) {
      setConversations([]);
      return;
    }

    type Slot = {
      threadId: string;
      threadType: ThreadType;
      otherPartyName: string;
      listingTitle: string;
      listingCategory: string;
    };
    const slots = new Map<string, Slot>();

    // Every application I'm a party to — either as the applicant or as the
    // listing owner — is a potential thread, whether or not any messages
    // have been sent yet. Legacy listings with no owner have nobody on the
    // other end, so they're skipped.
    const ownerIds = [...new Set(myApplications.map((a) => a.listing_owner_id).filter(Boolean))] as string[];
    const nameByOwnerId = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
      for (const o of owners ?? []) {
        if (o.full_name) nameByOwnerId.set(o.id, o.full_name);
      }
    }

    for (const a of myApplications) {
      if (!a.listing_owner_id) continue;
      slots.set(`application-${a.id}`, {
        threadId: a.id,
        threadType: "application",
        otherPartyName: nameByOwnerId.get(a.listing_owner_id) ?? a.listing_title,
        listingTitle: a.listing_title,
        listingCategory: a.listing_category,
      });
    }
    for (const a of incomingApplications) {
      slots.set(`application-${a.id}`, {
        threadId: a.id,
        threadType: "application",
        otherPartyName: a.applicant_name ?? "Applicant",
        listingTitle: a.listing_title,
        listingCategory: "",
      });
    }

    // Direct conversations — found via search, not tied to any application.
    const { data: directRows } = await supabase
      .from("conversations")
      .select("id, user_a, user_b")
      .or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`);

    const otherUserIds = (directRows ?? []).map((c) =>
      c.user_a === session.user.id ? c.user_b : c.user_a
    );
    const nameByUserId = new Map<string, string>();
    if (otherUserIds.length > 0) {
      const { data: others } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", otherUserIds);
      for (const o of others ?? []) {
        if (o.full_name) nameByUserId.set(o.id, o.full_name);
      }
    }

    for (const c of directRows ?? []) {
      const otherId = c.user_a === session.user.id ? c.user_b : c.user_a;
      slots.set(`direct-${c.id}`, {
        threadId: c.id,
        threadType: "direct",
        otherPartyName: nameByUserId.get(otherId) ?? "Circle member",
        listingTitle: "",
        listingCategory: "",
      });
    }

    if (slots.size === 0) {
      setConversations([]);
      return;
    }

    const applicationIds = [...slots.values()].filter((s) => s.threadType === "application").map((s) => s.threadId);
    const conversationIds = [...slots.values()].filter((s) => s.threadType === "direct").map((s) => s.threadId);

    const [appMessages, directMessages] = await Promise.all([
      applicationIds.length > 0
        ? supabase
            .from("messages")
            .select("id, application_id, sender_id, body, created_at, read_at")
            .in("application_id", applicationIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      conversationIds.length > 0
        ? supabase
            .from("messages")
            .select("id, conversation_id, sender_id, body, created_at, read_at")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const lastByThread = new Map<string, { body: string; created_at: string }>();
    const unreadByThread = new Map<string, number>();

    for (const m of appMessages.data ?? []) {
      const key = `application-${m.application_id}`;
      lastByThread.set(key, { body: m.body, created_at: m.created_at });
      if (m.sender_id !== session.user.id && !m.read_at) {
        unreadByThread.set(key, (unreadByThread.get(key) ?? 0) + 1);
      }
    }
    for (const m of directMessages.data ?? []) {
      const key = `direct-${m.conversation_id}`;
      lastByThread.set(key, { body: m.body, created_at: m.created_at });
      if (m.sender_id !== session.user.id && !m.read_at) {
        unreadByThread.set(key, (unreadByThread.get(key) ?? 0) + 1);
      }
    }

    const list = [...slots.entries()].map(([key, slot], index) => {
      const last = lastByThread.get(key);
      return {
        threadId: slot.threadId,
        threadType: slot.threadType,
        otherPartyName: slot.otherPartyName,
        initials: getInitials(slot.otherPartyName),
        avatarColor: index % 2 === 0 ? colors.dark : colors.accentDark,
        listingTitle: slot.listingTitle,
        listingCategory: slot.listingCategory,
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.created_at ?? "",
        unreadCount: unreadByThread.get(key) ?? 0,
      };
    });

    list.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    setConversations(list);
  }, [session, myApplications, incomingApplications]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchNotifications(), fetchConversations()]);
    setLoading(false);
  }, [fetchNotifications, fetchConversations]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, myApplications, incomingApplications]);

  const startConversation = useCallback(
    async (otherUserId: string) => {
      if (!session) throw new Error("Not signed in");

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(user_a.eq.${session.user.id},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${session.user.id})`
        )
        .maybeSingle();

      if (existing) return existing.id as string;

      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_a: session.user.id, user_b: otherUserId })
        .select("id")
        .single();
      if (error) throw error;

      await refresh();
      return data.id as string;
    },
    [session, refresh]
  );

  return (
    <MessagesContext.Provider
      value={{ notifications, conversations, loading, refresh, startConversation }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within a MessagesProvider");
  return ctx;
}
