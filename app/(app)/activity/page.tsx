"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import TransactionRow from "../../../components/TransactionRow";
import EditTransactionDialog from "../../../components/activity/EditTransactionDialog";
import UndoToast from "../../../components/UndoToast";
import { DEFAULT_CATEGORIES } from "../../../lib/categories";
import {
  type Expense,
  type PaymentMethod,
  type TransactionType,
} from "../../../lib/types";
import { apiSend } from "../../../lib/api-client";
import {
  useCategories,
  useDeleteExpense,
  useExpenses,
  useInvalidateMoney,
  useRepeatExpense,
} from "../../../hooks/useFinanceQueries";

export default function ActivityPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [type, setType] = useState<"" | TransactionType>("");
  const [method, setMethod] = useState<"" | PaymentMethod>("");
  const [category, setCategory] = useState("");
  const [range, setRange] = useState<"all" | "week" | "month">("month");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [toast, setToast] = useState("");
  const [undoExpense, setUndoExpense] = useState<Expense | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const filters = {
    q: debouncedQ,
    type,
    method,
    category,
    range,
  };

  const { data: expenses = [], isPending } = useExpenses(filters);
  const { data: categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    custom: false as boolean | undefined,
  })) } = useCategories();
  const repeatMutation = useRepeatExpense();
  const deleteMutation = useDeleteExpense();
  const createExpense = useInvalidateMoney();
  const qc = useQueryClient();

  async function repeat(id: string) {
    await repeatMutation.mutateAsync(id);
    setToast("Added for today");
    setTimeout(() => setToast(""), 2000);
  }

  async function remove(id: string) {
    if (!confirm("Delete this transaction?")) return;
    const snapshot = expenses.find((e) => e.id === id) || null;
    await deleteMutation.mutateAsync(id);
    if (snapshot) {
      setUndoExpense(snapshot);
      setTimeout(
        () => setUndoExpense((u) => (u?.id === snapshot.id ? null : u)),
        8000
      );
    }
  }

  async function restoreExpense(e: Expense) {
    await apiSend("/api/expenses", "POST", {
      title: e.title,
      amount: e.amount,
      category: e.category,
      type: e.type,
      paymentMethod: e.paymentMethod,
      cardId: e.cardId,
      createdAt: e.createdAt,
      pendingId: e.pendingId ?? undefined,
    });
    await createExpense();
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 md:text-3xl">
          Activity
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Search, filter, edit, or repeat.
        </p>
      </header>

      {toast && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          {toast}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr] lg:items-start lg:gap-6">
        <div className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-3 dark:border-stone-700 dark:bg-stone-900/90 md:p-4 lg:sticky lg:top-8">
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              className="mt-1"
              placeholder="Title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "week", "month"] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                type="button"
                variant={range === r ? "default" : "outline"}
                onClick={() => setRange(r)}
              >
                {r === "all" ? "All time" : r === "week" ? "Week" : "Month"}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              variant={type === "" ? "default" : "outline"}
              onClick={() => setType("")}
            >
              Any type
            </Button>
            {(["DEBIT", "CREDIT"] as TransactionType[]).map((t) => (
              <Button
                key={t}
                size="sm"
                type="button"
                variant={type === t ? "default" : "outline"}
                onClick={() => setType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              variant={method === "" ? "default" : "outline"}
              onClick={() => setMethod("")}
            >
              Any method
            </Button>
            {(["CASH", "UPI", "CC"] as PaymentMethod[]).map((m) => (
              <Button
                key={m}
                size="sm"
                type="button"
                variant={method === m ? "default" : "outline"}
                onClick={() => setMethod(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              variant={category === "" ? "default" : "outline"}
              onClick={() => setCategory("")}
            >
              Any category
            </Button>
            {categories.map((c) => (
              <Button
                key={c.value}
                size="sm"
                type="button"
                variant={category === c.value ? "default" : "outline"}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white/90 px-3 dark:border-stone-700 dark:bg-stone-900/90 md:px-4">
          {isPending ? (
            <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
              Loading…
            </p>
          ) : expenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
              No matching transactions.
            </p>
          ) : (
            expenses.map((e) => (
              <TransactionRow
                key={e.id}
                expense={e}
                onRepeat={e.fromPending ? undefined : () => repeat(e.id)}
                onEdit={() => setEditing(e)}
                onDelete={() => remove(e.id)}
              />
            ))
          )}
        </div>
      </div>

      <EditTransactionDialog
        expense={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["expenses"] });
          createExpense();
        }}
      />

      {undoExpense && (
        <UndoToast
          message="Transaction deleted"
          onUndo={() => restoreExpense(undoExpense)}
          onDismiss={() => setUndoExpense(null)}
        />
      )}
    </div>
  );
}
