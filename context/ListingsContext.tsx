import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { SkillCategory } from "../constants/scoring";

export type ListingCategory = "Jobs" | "Freelance" | "Investors" | "Startups" | "Mentors";

export type Listing = {
  id: string;
  category: ListingCategory;
  title: string;
  subtitle: string;
  verified: boolean;
  metric_label: string;
  metric_value: string;
  secondary_label: string;
  secondary_value: string;
  secondary_value_accent: boolean;
  action_label: string;
  button_variant: "dark" | "accent";
  score_required: number | null;
  score_required_category: SkillCategory | null;
};

type ListingsContextValue = {
  listings: Listing[];
  listingsByCategory: Record<string, Listing[]>;
  loading: boolean;
  isApplied: (listingId: string) => boolean;
  apply: (listingId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const ListingsContext = createContext<ListingsContextValue | undefined>(undefined);

export function ListingsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!session) {
      setListings([]);
      setAppliedIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    const [listingsRes, applicationsRes] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: true }),
      supabase.from("applications").select("listing_id").eq("user_id", session.user.id),
    ]);

    if (listingsRes.error) {
      console.warn("Failed to fetch listings:", listingsRes.error.message);
      setListings([]);
    } else {
      setListings((listingsRes.data ?? []) as Listing[]);
    }

    if (applicationsRes.error) {
      console.warn("Failed to fetch applications:", applicationsRes.error.message);
      setAppliedIds(new Set());
    } else {
      setAppliedIds(new Set((applicationsRes.data ?? []).map((a) => a.listing_id as string)));
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const listingsByCategory = useMemo(() => {
    const grouped: Record<string, Listing[]> = {};
    for (const listing of listings) {
      (grouped[listing.category] ??= []).push(listing);
    }
    return grouped;
  }, [listings]);

  const isApplied = useCallback((listingId: string) => appliedIds.has(listingId), [appliedIds]);

  const apply = useCallback(
    async (listingId: string) => {
      if (!session || appliedIds.has(listingId)) return;

      const { error } = await supabase
        .from("applications")
        .insert({ user_id: session.user.id, listing_id: listingId });

      if (error) {
        console.warn("Failed to apply:", error.message);
        return;
      }

      setAppliedIds((prev) => new Set(prev).add(listingId));
    },
    [session, appliedIds]
  );

  return (
    <ListingsContext.Provider
      value={{ listings, listingsByCategory, loading, isApplied, apply, refresh: fetchAll }}
    >
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error("useListings must be used within a ListingsProvider");
  return ctx;
}
