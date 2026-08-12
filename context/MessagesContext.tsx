import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { getInitials } from "../lib/initials";
import { colors } from "../constants/theme";

export type MessageTarget = "credits" | "explore";

export type Message = {
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

type MessagesContextValue = {
  messages: Message[];
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!session) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [claimsRes, applicationsRes] = await Promise.all([
      supabase
        .from("credit_claims")
        .select("id, title, skill_category, points, org, status, resolved_at")
        .eq("user_id", session.user.id)
        .neq("status", "pending"),
      supabase
        .from("applications")
        .select("id, applied_at, listing:listings(category, title, subtitle)")
        .eq("user_id", session.user.id),
    ]);

    type RawItem = Omit<Message, "initials" | "avatarColor">;
    const items: RawItem[] = [];

    if (claimsRes.error) {
      console.warn("Failed to fetch claims for messages:", claimsRes.error.message);
    } else {
      for (const claim of claimsRes.data ?? []) {
        if (!claim.resolved_at) continue;
        const approved = claim.status === "approved";
        items.push({
          id: `claim-${claim.id}`,
          senderName: claim.org,
          preview: approved
            ? `${claim.title} verified — +${claim.points} ${claim.skill_category} credits released.`
            : `Your claim for "${claim.title}" could not be verified.`,
          tag: approved ? "Verification · Approved" : "Verification · Not verified",
          timestamp: claim.resolved_at,
          unread: isRecent(claim.resolved_at),
          target: "credits",
        });
      }
    }

    if (applicationsRes.error) {
      console.warn("Failed to fetch applications for messages:", applicationsRes.error.message);
    } else {
      for (const app of applicationsRes.data ?? []) {
        const listing = app.listing as unknown as
          | { category: string; title: string; subtitle: string }
          | null;
        if (!listing) continue;
        const senderName =
          listing.category === "Jobs" ? listing.subtitle.split(" · ")[0] : listing.title;
        items.push({
          id: `application-${app.id}`,
          senderName,
          preview: `Thanks for your interest in ${listing.title}. We'll be in touch.`,
          tag: `${listing.category} · ${listing.title}`,
          timestamp: app.applied_at,
          unread: isRecent(app.applied_at),
          target: "explore",
        });
      }
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setMessages(
      items.map((item, index) => ({
        ...item,
        initials: getInitials(item.senderName),
        avatarColor: index % 2 === 0 ? colors.dark : colors.accentDark,
      }))
    );
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return (
    <MessagesContext.Provider value={{ messages, loading, refresh: fetchMessages }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within a MessagesProvider");
  return ctx;
}
