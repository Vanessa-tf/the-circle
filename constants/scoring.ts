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

// Company > Institution > Mentor > Peer, per the credibility hierarchy —
// scales how much of a credit's points count toward Circle Score totals.
export const VERIFIER_WEIGHTS: Record<(typeof VERIFIER_TYPES)[number], number> = {
  "Employer verified": 1.0,
  "Institution verified": 0.85,
  "University verified": 0.85,
  "Client verified": 0.6,
  "Mentor verified": 0.45,
  "Peer verified": 0.25,
};

export function verifierWeight(verifiedBy: string): number {
  return VERIFIER_WEIGHTS[verifiedBy as (typeof VERIFIER_TYPES)[number]] ?? 1.0;
}

export function weightedPoints(credit: { points: number; verified_by: string }): number {
  return credit.points * verifierWeight(credit.verified_by);
}
