import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type AffiliationStatus = "pending" | "approved" | "rejected";

export type Affiliation = {
  id: string;
  individual_id: string;
  org_id: string;
  status: AffiliationStatus;
  requested_at: string;
  resolved_at: string | null;
};

type MyAffiliation = Affiliation & { org_name: string | null };
type IncomingAffiliation = Affiliation & { individual_name: string | null };

type AffiliationsContextValue = {
  myAffiliations: MyAffiliation[];
  incomingAffiliations: IncomingAffiliation[];
  loading: boolean;
  refresh: () => Promise<void>;
  requestAffiliation: (orgId: string) => Promise<void>;
  resolveAffiliation: (affiliationId: string, approve: boolean) => Promise<void>;
};

const AffiliationsContext = createContext<AffiliationsContextValue | undefined>(undefined);

const COLUMNS = "id, individual_id, org_id, status, requested_at, resolved_at";

export function AffiliationsProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [myAffiliations, setMyAffiliations] = useState<MyAffiliation[]>([]);
  const [incomingAffiliations, setIncomingAffiliations] = useState<IncomingAffiliation[]>([]);
  const [loading, setLoading] = useState(true);

  const isOrg = profile?.account_type === "Company" || profile?.account_type === "Institution";

  const fetchAll = useCallback(async () => {
    if (!session || !profile) {
      setMyAffiliations([]);
      setIncomingAffiliations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isOrg) {
      const { data: rows, error } = await supabase
        .from("affiliations")
        .select(COLUMNS)
        .eq("org_id", session.user.id)
        .order("requested_at", { ascending: false });

      if (error || !rows) {
        console.warn("Failed to fetch affiliations:", error?.message);
        setIncomingAffiliations([]);
      } else {
        const individualIds = [...new Set(rows.map((r) => r.individual_id))];
        const { data: individuals } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", individualIds.length > 0 ? individualIds : [""]);
        const nameById = new Map((individuals ?? []).map((p) => [p.id, p.full_name]));

        setIncomingAffiliations(
          (rows as Affiliation[]).map((r) => ({
            ...r,
            individual_name: nameById.get(r.individual_id) ?? null,
          }))
        );
      }
      setMyAffiliations([]);
    } else {
      const { data: rows, error } = await supabase
        .from("affiliations")
        .select(COLUMNS)
        .eq("individual_id", session.user.id)
        .order("requested_at", { ascending: false });

      if (error || !rows) {
        console.warn("Failed to fetch affiliations:", error?.message);
        setMyAffiliations([]);
      } else {
        const orgIds = [...new Set(rows.map((r) => r.org_id))];
        const { data: orgs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", orgIds.length > 0 ? orgIds : [""]);
        const nameById = new Map((orgs ?? []).map((p) => [p.id, p.full_name]));

        setMyAffiliations(
          (rows as Affiliation[]).map((r) => ({
            ...r,
            org_name: nameById.get(r.org_id) ?? null,
          }))
        );
      }
      setIncomingAffiliations([]);
    }

    setLoading(false);
  }, [session, profile, isOrg]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const requestAffiliation = useCallback(
    async (orgId: string) => {
      if (!session) throw new Error("Not signed in");
      const { error } = await supabase
        .from("affiliations")
        .insert({ individual_id: session.user.id, org_id: orgId });
      if (error) throw error;
      await fetchAll();
    },
    [session, fetchAll]
  );

  const resolveAffiliation = useCallback(
    async (affiliationId: string, approve: boolean) => {
      const { error } = await supabase.rpc("resolve_affiliation", {
        p_affiliation_id: affiliationId,
        p_approve: approve,
      });
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll]
  );

  return (
    <AffiliationsContext.Provider
      value={{
        myAffiliations,
        incomingAffiliations,
        loading,
        refresh: fetchAll,
        requestAffiliation,
        resolveAffiliation,
      }}
    >
      {children}
    </AffiliationsContext.Provider>
  );
}

export function useAffiliations() {
  const ctx = useContext(AffiliationsContext);
  if (!ctx) throw new Error("useAffiliations must be used within an AffiliationsProvider");
  return ctx;
}
