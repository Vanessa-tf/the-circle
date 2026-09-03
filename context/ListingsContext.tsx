import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { SkillCategory } from "../constants/scoring";

export type ListingCategory = "Jobs" | "Freelance" | "Investors" | "Startups" | "Mentors";
export type ListingStatus = "open" | "closed";
export type ApplicationStatus = "applied" | "accepted" | "rejected";

export type Answer = { question: string; answer: string };

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
  owner_id: string | null;
  status: ListingStatus;
  questions: string[];
};

export type NewListingInput = {
  category: ListingCategory;
  title: string;
  subtitle: string;
  metric_label: string;
  metric_value: string;
  secondary_label: string;
  secondary_value: string;
  secondary_value_accent: boolean;
  action_label: string;
  button_variant: "dark" | "accent";
  score_required: number | null;
  score_required_category: SkillCategory | null;
  questions: string[];
};

export type Application = {
  id: string;
  user_id: string;
  listing_id: string;
  status: ApplicationStatus;
  note: string;
  answers: Answer[];
  applied_at: string;
  resolved_at: string | null;
};

type IncomingApplication = Application & { applicant_name: string | null; listing_title: string };

export type MyApplication = Application & {
  listing_title: string;
  listing_category: ListingCategory;
  listing_owner_id: string | null;
};

type ListingsContextValue = {
  listings: Listing[];
  listingsByCategory: Record<string, Listing[]>;
  myListings: Listing[];
  myApplications: MyApplication[];
  incomingApplications: IncomingApplication[];
  loading: boolean;
  isApplied: (listingId: string) => boolean;
  apply: (listingId: string, note: string, answers?: Answer[]) => Promise<void>;
  createListing: (input: NewListingInput) => Promise<Listing>;
  closeListing: (listingId: string) => Promise<void>;
  resolveApplication: (applicationId: string, approve: boolean) => Promise<void>;
  undoApplicationResolution: (applicationId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const ListingsContext = createContext<ListingsContextValue | undefined>(undefined);

const LISTING_COLUMNS =
  "id, category, title, subtitle, verified, metric_label, metric_value, secondary_label, secondary_value, secondary_value_accent, action_label, button_variant, score_required, score_required_category, owner_id, status, questions";
const APPLICATION_COLUMNS = "id, user_id, listing_id, status, note, answers, applied_at, resolved_at";

export function ListingsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [incomingApplications, setIncomingApplications] = useState<IncomingApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!session) {
      setListings([]);
      setAppliedIds(new Set());
      setMyListings([]);
      setMyApplications([]);
      setIncomingApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [listingsRes, applicationsRes, myListingsRes] = await Promise.all([
      supabase.from("listings").select(LISTING_COLUMNS).order("created_at", { ascending: true }),
      supabase
        .from("applications")
        .select(`${APPLICATION_COLUMNS}, listing:listings(title, category, owner_id)`)
        .eq("user_id", session.user.id)
        .order("applied_at", { ascending: false }),
      supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (listingsRes.error) {
      console.warn("Failed to fetch listings:", listingsRes.error.message);
      setListings([]);
    } else {
      setListings((listingsRes.data ?? []) as Listing[]);
    }

    if (applicationsRes.error || !applicationsRes.data) {
      console.warn("Failed to fetch applications:", applicationsRes.error?.message);
      setAppliedIds(new Set());
      setMyApplications([]);
    } else {
      type Row = Application & {
        listing: { title: string; category: ListingCategory; owner_id: string | null } | null;
      };
      const rows = applicationsRes.data as unknown as Row[];
      setAppliedIds(new Set(rows.map((a) => a.listing_id)));
      setMyApplications(
        rows.map(({ listing, ...a }) => ({
          ...a,
          listing_title: listing?.title ?? "",
          listing_category: listing?.category ?? "Jobs",
          listing_owner_id: listing?.owner_id ?? null,
        }))
      );
    }

    if (myListingsRes.error || !myListingsRes.data) {
      console.warn("Failed to fetch my listings:", myListingsRes.error?.message);
      setMyListings([]);
      setIncomingApplications([]);
    } else {
      const mine = myListingsRes.data as Listing[];
      setMyListings(mine);

      const listingIds = mine.map((l) => l.id);
      if (listingIds.length === 0) {
        setIncomingApplications([]);
      } else {
        const { data: apps, error: appsError } = await supabase
          .from("applications")
          .select(APPLICATION_COLUMNS)
          .in("listing_id", listingIds)
          .order("applied_at", { ascending: false });

        if (appsError || !apps) {
          console.warn("Failed to fetch incoming applications:", appsError?.message);
          setIncomingApplications([]);
        } else {
          const applicantIds = [...new Set(apps.map((a) => a.user_id))];
          const { data: applicants } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", applicantIds.length > 0 ? applicantIds : [""]);

          const nameById = new Map((applicants ?? []).map((p) => [p.id, p.full_name]));
          const titleById = new Map(mine.map((l) => [l.id, l.title]));

          setIncomingApplications(
            (apps as Application[]).map((a) => ({
              ...a,
              applicant_name: nameById.get(a.user_id) ?? null,
              listing_title: titleById.get(a.listing_id) ?? "",
            }))
          );
        }
      }
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
    async (listingId: string, note: string, answers: Answer[] = []) => {
      if (!session || appliedIds.has(listingId)) return;

      const { error } = await supabase
        .from("applications")
        .insert({ user_id: session.user.id, listing_id: listingId, note, answers });

      if (error) {
        console.warn("Failed to apply:", error.message);
        return;
      }

      setAppliedIds((prev) => new Set(prev).add(listingId));
    },
    [session, appliedIds]
  );

  const createListing = useCallback(
    async (input: NewListingInput) => {
      if (!session) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("listings")
        .insert({ ...input, owner_id: session.user.id })
        .select(LISTING_COLUMNS)
        .single();
      if (error) throw error;
      await fetchAll();
      return data as Listing;
    },
    [session, fetchAll]
  );

  const closeListing = useCallback(
    async (listingId: string) => {
      const { error } = await supabase.from("listings").update({ status: "closed" }).eq("id", listingId);
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll]
  );

  const resolveApplication = useCallback(
    async (applicationId: string, approve: boolean) => {
      const { error } = await supabase.rpc("resolve_application", {
        p_application_id: applicationId,
        p_approve: approve,
      });
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll]
  );

  const undoApplicationResolution = useCallback(
    async (applicationId: string) => {
      const { error } = await supabase.rpc("undo_application_resolution", {
        p_application_id: applicationId,
      });
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll]
  );

  return (
    <ListingsContext.Provider
      value={{
        listings,
        listingsByCategory,
        myListings,
        myApplications,
        incomingApplications,
        loading,
        isApplied,
        apply,
        createListing,
        closeListing,
        resolveApplication,
        undoApplicationResolution,
        refresh: fetchAll,
      }}
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
