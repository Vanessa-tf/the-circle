import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { SkillCategory } from "../constants/scoring";

export type ClaimStatus = "pending" | "approved" | "rejected";

export type Claim = {
  id: string;
  title: string;
  skill_category: SkillCategory;
  points: number;
  org: string;
  verified_by: string;
  status: ClaimStatus;
  verify_token: string;
  created_at: string;
};

export type NewClaimInput = {
  title: string;
  skill_category: SkillCategory;
  points: number;
  org: string;
  verified_by: string;
};

type ClaimsContextValue = {
  claims: Claim[];
  loading: boolean;
  refresh: () => Promise<void>;
  submitClaim: (input: NewClaimInput) => Promise<Claim>;
};

const ClaimsContext = createContext<ClaimsContextValue | undefined>(undefined);

export function ClaimsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    if (!session) {
      setClaims([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("credit_claims")
      .select("id, title, skill_category, points, org, verified_by, status, verify_token, created_at")
      .eq("user_id", session.user.id)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Failed to fetch claims:", error.message);
      setClaims([]);
    } else {
      setClaims((data ?? []) as Claim[]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const submitClaim = useCallback(
    async (input: NewClaimInput) => {
      if (!session) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("credit_claims")
        .insert({ ...input, user_id: session.user.id })
        .select("id, title, skill_category, points, org, verified_by, status, verify_token, created_at")
        .single();
      if (error) throw error;
      await fetchClaims();
      return data as Claim;
    },
    [session, fetchClaims]
  );

  return (
    <ClaimsContext.Provider value={{ claims, loading, refresh: fetchClaims, submitClaim }}>
      {children}
    </ClaimsContext.Provider>
  );
}

export function useClaims() {
  const ctx = useContext(ClaimsContext);
  if (!ctx) throw new Error("useClaims must be used within a ClaimsProvider");
  return ctx;
}
