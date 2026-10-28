export type TransactionType = "CREDIT" | "DEBIT";
export type PaymentMethod = "CASH" | "UPI" | "CC";

export type CreditCard = {
  id: string;
  name: string;
  last4: string | null;
  isActive: boolean;
  statementDay?: number | null;
  dueDay?: number | null;
  createdAt: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
  category: string;
  type: TransactionType;
  paymentMethod: PaymentMethod | null;
  cardId: string | null;
  card?: CreditCard | null;
  accountId?: string | null;
  account?: { id: string; name: string } | null;
  /** True when this ledger row came from marking a due Paid */
  fromPending?: boolean;
  pendingId?: string | null;
};

export type SummaryCharts = {
  dailySpend: { date: string; label: string; amount: number }[];
  byCategory: { category: string; name: string; amount: number }[];
  byMethod: { method: string; key: string; amount: number }[];
  weekdayHeatmap: {
    weekdays: string[];
    weeks: {
      weekLabel: string;
      days: { date: string; weekday: string; amount: number }[];
    }[];
    max: number;
  };
};

export type MoneyAccountRow = {
  id: string;
  name: string;
  openingBalance?: number;
  isActive: boolean;
  balance: number;
};

export type InvestmentRow = {
  id: string;
  name: string;
  kind: "MF" | "STOCK" | "FD" | "RD" | "PPF" | "GOLD" | "SILVER" | "OTHER";
  investedAmount: number;
  currentValue: number;
  grams?: number | null;
  gain?: number;
  monthly?: {
    amount: number;
    dayOfMonth: number;
    totalMonths: number | null;
  } | null;
};

export const INVESTMENT_KINDS: { value: InvestmentRow["kind"]; label: string }[] =
  [
    { value: "MF", label: "Mutual fund" },
    { value: "STOCK", label: "Stock" },
    { value: "FD", label: "FD" },
    { value: "RD", label: "RD" },
    { value: "PPF", label: "PPF" },
    { value: "GOLD", label: "Gold" },
    { value: "SILVER", label: "Silver" },
    { value: "OTHER", label: "Other" },
  ];

export type SavingsGoalRow = {
  id: string;
  title: string | null;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  progress: number;
};

export type SummaryResponse = {
  spentToday: number;
  mainBalance: number;
  liquid?: number;
  unassigned?: number;
  netWorth?: number;
  investedTotal?: number;
  investmentsValue?: number;
  cardOwed?: number;
  accounts?: MoneyAccountRow[];
  month: {
    key: string;
    credited: number;
    spentCashUpi: number;
    spentCc: number;
  };
  cards: {
    id: string;
    name: string;
    last4: string | null;
    spentThisMonth: number;
  }[];
  budgets: { category: string; limit: number; spent: number }[];
  recent: Expense[];
  charts: SummaryCharts;
  duesBadge?: number;
  upcomingDues?: {
    id: string;
    title: string;
    amount: number;
    payee: string | null;
    dueDate: string;
  }[];
  cardBills?: {
    id: string;
    name: string;
    last4: string | null;
    owed: number;
    dueDate: string;
    daysLeft: number;
    dueSoon: boolean;
  }[];
  compare?: {
    mode: "week" | "month";
    currentTotal: number;
    previousTotal: number;
    deltaPct: number;
    movers: {
      category: string;
      name: string;
      current: number;
      previous: number;
      change: number;
      pct: number;
    }[];
  };
  savingsGoals?: {
    id: string;
    title: string | null;
    targetAmount: number;
    savedAmount: number;
    deadline: string;
    progressPct: number;
  }[];
};

export const COMMON_TITLES: Record<string, string> = {
  Snacks: "FOOD",
  Breakfast: "FOOD",
  Groceries: "FOOD",
  OTT: "ENTERTAINMENT",
  Dinner: "FOOD",
  Lunch: "FOOD",
  Petrol: "TRANSPORT",
  Shopping: "OTHER",
  Salary: "OTHER",
};
