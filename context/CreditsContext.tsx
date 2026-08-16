import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { SKILL_CATEGORIES, SkillCategory, weightedPoints } from "../constants/scoring";

export type Credit = {
  id: string;
  title: string;
  skill_category: SkillCategory;
  points: number;
  verified_by: string;
  org: string;
  awarded_at: string;
  verifier_weight: number;
  consistency_factor: number;
};

type CreditsContextValue = {
  credits: Credit[];
  timelineCredits: Credit[];
  loading: boolean;
  totalScore: number;
  skillTotals: Record<SkillCategory, number>;
  verificationsCount: number;
  scoreHistory: { label: string; value: number }[];
  thisWeekDelta: number;
  thisMonthDelta: number;
  refresh: () => Promise<void>;
};

const CreditsContext = createContext<CreditsContextValue | undefined>(undefined);

function emptySkillTotals(): Record<SkillCategory, number> {
  return SKILL_CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category]: 0 }),
    {} as Record<SkillCategory, number>
  );
}

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!session) {
      setCredits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("credits")
      .select("id, title, skill_category, points, verified_by, org, awarded_at, verifier_weight, consistency_factor")
      .eq("user_id", session.user.id)
      .order("awarded_at", { ascending: true });

    if (error) {
      console.warn("Failed to fetch credits:", error.message);
      setCredits([]);
    } else {
      setCredits((data ?? []) as Credit[]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const derived = useMemo(() => {
    const timelineCredits = [...credits].reverse();
    const totalScore = credits.reduce((sum, c) => sum + weightedPoints(c), 0);

    const skillTotals = emptySkillTotals();
    for (const c of credits) {
      skillTotals[c.skill_category] += weightedPoints(c);
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisWeekDelta = credits
      .filter((c) => new Date(c.awarded_at) >= weekAgo)
      .reduce((sum, c) => sum + weightedPoints(c), 0);
    const thisMonthDelta = credits
      .filter((c) => new Date(c.awarded_at) >= monthStart)
      .reduce((sum, c) => sum + weightedPoints(c), 0);

    // Cumulative score by month, oldest to newest — each point is the
    // running total as of the last credit awarded within that month.
    const monthlyTotals = new Map<string, { label: string; value: number }>();
    let running = 0;
    for (const c of credits) {
      const d = new Date(c.awarded_at);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      running += weightedPoints(c);
      const label = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      monthlyTotals.set(sortKey, { label, value: running });
    }
    const scoreHistory = Array.from(monthlyTotals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, entry]) => ({ ...entry, value: Math.round(entry.value) }));

    const roundedSkillTotals = emptySkillTotals();
    for (const category of SKILL_CATEGORIES) {
      roundedSkillTotals[category] = Math.round(skillTotals[category]);
    }

    return {
      timelineCredits,
      totalScore: Math.round(totalScore),
      skillTotals: roundedSkillTotals,
      verificationsCount: credits.length,
      scoreHistory,
      thisWeekDelta: Math.round(thisWeekDelta),
      thisMonthDelta: Math.round(thisMonthDelta),
    };
  }, [credits]);

  return (
    <CreditsContext.Provider value={{ credits, loading, refresh: fetchCredits, ...derived }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within a CreditsProvider");
  return ctx;
}
