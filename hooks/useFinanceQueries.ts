"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiGet, apiSend } from "../lib/api-client";
import { moneyQueryRoots, queryKeys } from "../lib/query-keys";
import type { CreditCard, Expense, SummaryResponse } from "../lib/types";

type Pending = {
  id: string;
  title: string;
  amount: number;
  payee: string | null;
  dueDate: string;
  status: "PENDING" | "PAID" | "SKIPPED";
  paymentMethod: string | null;
  paidCount: number;
  totalMonths: number | null;
};

type RecurringRule = {
  id: string;
  title: string;
  amount: number;
  category: string;
  paymentMethod: string | null;
  cardId: string | null;
  payee: string | null;
  dayOfMonth: number;
  totalMonths: number | null;
  isActive: boolean;
  paidCount: number;
};

export function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      moneyQueryRoots.map((root) => qc.invalidateQueries({ queryKey: [root] }))
    );
}

export function useSummary(compare: "week" | "month" = "month") {
  return useQuery({
    queryKey: queryKeys.summary(compare),
    queryFn: () =>
      apiGet<SummaryResponse>(`/api/summary?compare=${compare}`),
  });
}

export function usePendings() {
  return useQuery({
    queryKey: queryKeys.pendings,
    queryFn: () => apiGet<Pending[]>("/api/pendings"),
  });
}

export function useExpenses(filters: {
  q: string;
  type: string;
  method: string;
  category: string;
  range: "all" | "week" | "month";
}) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.type) params.set("type", filters.type);
  if (filters.method) params.set("paymentMethod", filters.method);
  if (filters.category) params.set("category", filters.category);

  const now = new Date();
  if (filters.range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    params.set("from", start.toISOString());
    params.set("to", now.toISOString());
  } else if (filters.range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    params.set("from", start.toISOString());
    params.set("to", now.toISOString());
  }

  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.expenses(Object.fromEntries(params.entries())),
    queryFn: () => apiGet<Expense[]>(`/api/expenses${qs ? `?${qs}` : ""}`),
    placeholderData: (prev) => prev,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const data = await apiGet<{ categories: { value: string; label: string }[] }>(
        "/api/categories"
      );
      return data.categories;
    },
    staleTime: 60_000,
  });
}

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards,
    queryFn: () => apiGet<CreditCard[]>("/api/cards"),
  });
}

export function useRecurring() {
  return useQuery({
    queryKey: queryKeys.recurring,
    queryFn: () => apiGet<RecurringRule[]>("/api/recurring"),
  });
}

type BudgetsResponse = {
  month: string;
  budgets: { category: string; amount: number }[];
};

type SavingsGoalResponse = {
  goal: {
    title: string | null;
    targetAmount: number;
    deadline: string;
  } | null;
  mainBalance: number;
  progress: number;
};

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets(),
    queryFn: () => apiGet<BudgetsResponse>("/api/budgets"),
  });
}

export function useSavingsGoal() {
  return useQuery({
    queryKey: queryKeys.savingsGoal,
    queryFn: () => apiGet<SavingsGoalResponse>("/api/savings-goal"),
  });
}

export function useUpdateExpense() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      apiSend(`/api/expenses/${id}`, "PATCH", body),
    onSuccess: () => invalidate(),
  });
}

export function useCreateExpense() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (body: unknown) => apiSend("/api/expenses", "POST", body),
    onSuccess: () => invalidate(),
  });
}

export function useRepeatExpense() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend("/api/expenses/repeat", "POST", { id }),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: (id: string) => apiSend(`/api/expenses/${id}`, "DELETE"),
    onSuccess: () => invalidate(),
  });
}

export function usePayPending() {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt: string }) =>
      apiSend(`/api/pendings/${id}/pay`, "POST", { paidAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pendings });
      invalidate();
    },
  });
}

export function useSkipPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend(`/api/pendings/${id}/skip`, "POST"),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pendings }),
  });
}

export function useUndoPayPending() {
  const invalidate = useInvalidateMoney();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend(`/api/pendings/${id}/undo-pay`, "POST"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pendings });
      invalidate();
    },
  });
}
