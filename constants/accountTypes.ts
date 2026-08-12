export const ACCOUNT_TYPES = ["Individual", "Company", "Institution"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
