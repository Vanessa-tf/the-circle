import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { SKILL_CATEGORIES, SkillCategory, weightedPoints } from "../constants/scoring";

export type Candidate = {
  id: string;
  full_name: string | null;
  role: string | null;
  location: string | null;
  avatar_url: string | null;
  totalScore: number;
  skillTotals: Record<SkillCategory, number>;
};

type CandidatesContextValue = {
  candidates: Candidate[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const CandidatesContext = createContext<CandidatesContextValue | undefined>(undefined);

function emptySkillTotals(): Record<SkillCategory, number> {
  return SKILL_CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category]: 0 }),
    {} as Record<SkillCategory, number>
  );
}

export function CandidatesProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [profilesRes, creditsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, location, avatar_url")
        .eq("account_type", "Individual"),
      supabase
        .from("credits")
        .select("user_id, skill_category, points, verifier_weight, consistency_factor, awarded_at"),
    ]);

    if (profilesRes.error) {
      console.warn("Failed to fetch candidates:", profilesRes.error.message);
      setCandidates([]);
      setLoading(false);
      return;
    }

    const totalsByUser = new Map<string, Record<SkillCategory, number>>();
    for (const row of creditsRes.data ?? []) {
      const totals = totalsByUser.get(row.user_id) ?? emptySkillTotals();
      totals[row.skill_category as SkillCategory] += weightedPoints(row);
      totalsByUser.set(row.user_id, totals);
    }

    setCandidates(
      (profilesRes.data ?? []).map((p) => {
        const rawSkillTotals = totalsByUser.get(p.id) ?? emptySkillTotals();
        const skillTotals = emptySkillTotals();
        for (const category of SKILL_CATEGORIES) {
          skillTotals[category] = Math.round(rawSkillTotals[category]);
        }
        const totalScore = Object.values(skillTotals).reduce((sum, v) => sum + v, 0);
        return { ...p, skillTotals, totalScore };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const value = useMemo(
    () => ({ candidates, loading, refresh: fetchAll }),
    [candidates, loading, fetchAll]
  );

  return <CandidatesContext.Provider value={value}>{children}</CandidatesContext.Provider>;
}

export function useCandidates() {
  const ctx = useContext(CandidatesContext);
  if (!ctx) throw new Error("useCandidates must be used within a CandidatesProvider");
  return ctx;
}
