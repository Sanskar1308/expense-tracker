export type CategoryType =
  | "FOOD"
  | "TRANSPORT"
  | "UTILITIES"
  | "ENTERTAINMENT"
  | "OTHER";

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
  category: CategoryType;
  type: TransactionType;
  paymentMethod: PaymentMethod | null;
  cardId: string | null;
  card?: CreditCard | null;
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
};

export const CATEGORIES: { value: CategoryType; label: string }[] = [
  { value: "FOOD", label: "Food" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "OTHER", label: "Other" },
];

export const COMMON_TITLES: Record<string, CategoryType> = {
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
