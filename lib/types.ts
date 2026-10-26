export type TransactionType = "CREDIT" | "DEBIT";
export type PaymentMethod = "CASH" | "UPI" | "CC";

export type CreditCard = {
  id: string;
  name: string;
  last4: string | null;
  isActive: boolean;
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

export type SummaryResponse = {
  spentToday: number;
  mainBalance: number;
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
