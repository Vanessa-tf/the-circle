export const SKILL_CATEGORIES = [
  "Technical",
  "Leadership",
  "Sales",
  "Communication",
  "Execution",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

// Points at which a skill category's progress ring reads 100%.
export const SKILL_TARGET = 200;

export const VERIFIER_TYPES = [
  "Employer verified",
  "University verified",
  "Institution verified",
  "Client verified",
  "Mentor verified",
  "Peer verified",
] as const;

// verifier_weight and consistency_factor are computed server-side at
// approval time (see resolve_credit_claim / resolve_task_submission) and
// frozen onto the credit row, so a credit's value never silently drifts
// later just because someone's track record changed.
//
// Decay is the opposite: it's relative to *today*, so unlike the other two
// it can't be frozen at award time — it's recomputed on every read. Credits
// count at full value for their first year, then decay with a 2-year
// half-life, never dropping below 40% — old proof still counts for
// something, it just stops dominating over fresh proof.
const DECAY_GRACE_MONTHS = 12;
const DECAY_HALF_LIFE_MONTHS = 24;
const DECAY_FLOOR = 0.4;
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

export function decayFactor(awardedAt: string): number {
  const ageMonths = (Date.now() - new Date(awardedAt).getTime()) / MS_PER_MONTH;
  if (ageMonths <= DECAY_GRACE_MONTHS) return 1.0;
  const monthsIntoDecay = ageMonths - DECAY_GRACE_MONTHS;
  return Math.max(DECAY_FLOOR, Math.pow(0.5, monthsIntoDecay / DECAY_HALF_LIFE_MONTHS));
}

export function weightedPoints(credit: {
  points: number;
  verifier_weight: number;
  consistency_factor: number;
  awarded_at: string;
}): number {
  return (
    credit.points * credit.verifier_weight * credit.consistency_factor * decayFactor(credit.awarded_at)
  );
}
