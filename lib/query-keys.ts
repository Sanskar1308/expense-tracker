export const queryKeys = {
  summary: (compare: "week" | "month" = "month") =>
    ["summary", compare] as const,
  pendings: ["pendings"] as const,
  expenses: (filters: Record<string, string>) =>
    ["expenses", filters] as const,
  categories: ["categories"] as const,
  cards: ["cards"] as const,
  recurring: ["recurring"] as const,
  budgets: (month?: string) => ["budgets", month ?? "current"] as const,
  savingsGoal: ["savings-goal"] as const,
  accounts: ["accounts"] as const,
  investments: ["investments"] as const,
};

/** Invalidate after money-changing actions */
export const moneyQueryRoots = [
  "summary",
  "pendings",
  "expenses",
  "budgets",
  "savings-goal",
  "accounts",
  "investments",
  "recurring",
] as const;
