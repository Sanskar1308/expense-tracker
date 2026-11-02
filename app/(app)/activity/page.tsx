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
  type LedgerMoveRow,
  type PaymentMethod,
  type TransactionType,
} from "../../../lib/types";
import { apiSend } from "../../../lib/api-client";
import {
  useAccounts,
  useCards,
  useCategories,
  useDeleteExpense,
  useExpenses,
  useInvalidateMoney,
  useMoves,
  useRepeatExpense,
} from "../../../hooks/useFinanceQueries";

function cardPaymentExpense(move: LedgerMoveRow): Expense {
  return {
    id: move.id,
    title: `${move.toName} bill`,
    amount: move.amount,
    createdAt: move.createdAt,
    category: "Card bill",
    type: "DEBIT",
    paymentMethod: null,
    cardId: move.cardId ?? null,
    account: { id: move.fromAccountId ?? "", name: move.fromName },
  };
}

export default function ActivityPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [type, setType] = useState<"" | TransactionType>("");
  const [method, setMethod] = useState<"" | PaymentMethod>("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [cardId, setCardId] = useState("");
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
    accountId,
    cardId,
  };

  const { data: expenses = [], isPending } = useExpenses(filters);
  const { data: moves = [] } = useMoves();
  const { data: accountData } = useAccounts();
  const { data: cards = [] } = useCards();
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

  async function removeMove(id: string) {
    if (!confirm("Undo this card payment?")) return;
    await apiSend(`/api/moves/${id}`, "DELETE");
    await createExpense();
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
      accountId: e.accountId,
      createdAt: e.createdAt,
      pendingId: e.pendingId ?? undefined,
    });
    await createExpense();
  }

  const rangeStart =
    range === "week"
      ? new Date(
          new Date().setDate(new Date().getDate() - ((new Date().getDay() + 6) % 7))
        )
      : range === "month"
        ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        : null;
  if (rangeStart) rangeStart.setHours(0, 0, 0, 0);
  const search = debouncedQ.trim().toLowerCase();
  const cardPays = moves.filter((m) => {
    if (!m.cardId) return false;
    if (type === "CREDIT" || method === "CASH" || method === "UPI" || category) {
      return false;
    }
    if (cardId && m.cardId !== cardId) return false;
    if (accountId && m.fromAccountId !== accountId) return false;
    if (rangeStart && new Date(m.createdAt) < rangeStart) return false;
    if (
      search &&
      !`${m.toName} ${m.fromName} bill`.toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });
  const rows = [
    ...expenses.map((expense) => ({
      kind: "expense" as const,
      at: expense.createdAt,
      expense,
    })),
    ...cardPays.map((move) => ({
      kind: "pay" as const,
      at: move.createdAt,
      move,
    })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

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
          <div>
            <Label htmlFor="account">Account</Label>
            <select
              id="account"
              className="mt-1 flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Any account</option>
              {(accountData?.accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="card">Card</Label>
            <select
              id="card"
              className="mt-1 flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
            >
              <option value="">Any card</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
              No matching transactions.
            </p>
          ) : (
            rows.map((row) =>
              row.kind === "expense" ? (
                <TransactionRow
                  key={row.expense.id}
                  expense={row.expense}
                  onRepeat={
                    row.expense.fromPending
                      ? undefined
                      : () => repeat(row.expense.id)
                  }
                  onEdit={() => setEditing(row.expense)}
                  onDelete={() => remove(row.expense.id)}
                />
              ) : (
                <TransactionRow
                  key={row.move.id}
                  expense={cardPaymentExpense(row.move)}
                  onDelete={() => removeMove(row.move.id)}
                />
              )
            )
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
