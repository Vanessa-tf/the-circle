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
export function weightedPoints(credit: {
  points: number;
  verifier_weight: number;
  consistency_factor: number;
}): number {
  return credit.points * credit.verifier_weight * credit.consistency_factor;
}
