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

export type Conversation = {
  applicationId: string;
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

    // Every application I'm a party to — either as the applicant or as the
    // listing owner — is a potential conversation thread, whether or not
    // any messages have been sent in it yet. Legacy listings with no owner
    // have nobody on the other end, so they're skipped.
    type Slot = { applicationId: string; otherPartyName: string; listingTitle: string; listingCategory: string };
    const slots = new Map<string, Slot>();

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
      slots.set(a.id, {
        applicationId: a.id,
        otherPartyName: nameByOwnerId.get(a.listing_owner_id) ?? a.listing_title,
        listingTitle: a.listing_title,
        listingCategory: a.listing_category,
      });
    }
    for (const a of incomingApplications) {
      slots.set(a.id, {
        applicationId: a.id,
        otherPartyName: a.applicant_name ?? "Applicant",
        listingTitle: a.listing_title,
        listingCategory: "",
      });
    }

    if (slots.size === 0) {
      setConversations([]);
      return;
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, application_id, sender_id, body, created_at, read_at")
      .in("application_id", [...slots.keys()])
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Failed to fetch messages:", error.message);
    }

    const lastByApp = new Map<string, { body: string; created_at: string }>();
    const unreadByApp = new Map<string, number>();

    for (const m of messages ?? []) {
      lastByApp.set(m.application_id, { body: m.body, created_at: m.created_at });
      if (m.sender_id !== session.user.id && !m.read_at) {
        unreadByApp.set(m.application_id, (unreadByApp.get(m.application_id) ?? 0) + 1);
      }
    }

    const list = [...slots.values()].map((slot, index) => {
      const last = lastByApp.get(slot.applicationId);
      return {
        applicationId: slot.applicationId,
        otherPartyName: slot.otherPartyName,
        initials: getInitials(slot.otherPartyName),
        avatarColor: index % 2 === 0 ? colors.dark : colors.accentDark,
        listingTitle: slot.listingTitle,
        listingCategory: slot.listingCategory,
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.created_at ?? "",
        unreadCount: unreadByApp.get(slot.applicationId) ?? 0,
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

  return (
    <MessagesContext.Provider value={{ notifications, conversations, loading, refresh }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within a MessagesProvider");
  return ctx;
}
