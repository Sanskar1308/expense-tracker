"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import TransactionRow from "../../../components/TransactionRow";
import EditTransactionDialog from "../../../components/activity/EditTransactionDialog";
import type { CategoryOption } from "../../../lib/categories";
import { DEFAULT_CATEGORIES } from "../../../lib/categories";
import {
  type Expense,
  type PaymentMethod,
  type TransactionType,
} from "../../../lib/types";

export default function ActivityPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | TransactionType>("");
  const [method, setMethod] = useState<"" | PaymentMethod>("");
  const [category, setCategory] = useState("");
  const [range, setRange] = useState<"all" | "week" | "month">("month");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [toast, setToast] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, custom: false }))
  );

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (type) params.set("type", type);
    if (method) params.set("paymentMethod", method);
    if (category) params.set("category", category);

    const now = new Date();
    if (range === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      params.set("from", start.toISOString());
      params.set("to", now.toISOString());
    } else if (range === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      params.set("from", start.toISOString());
      params.set("to", now.toISOString());
    }

    const res = await fetch(`/api/expenses?${params}`);
    if (res.ok) setExpenses(await res.json());
  }, [q, type, method, category, range]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.categories)) setCategories(data.categories);
      })
      .catch(() => undefined);
  }, []);

  async function repeat(id: string) {
    const res = await fetch("/api/expenses/repeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setToast("Added for today");
      load();
      setTimeout(() => setToast(""), 2000);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this transaction?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Activity
        </h1>
        <p className="text-sm text-stone-600">Search, filter, edit, or repeat.</p>
      </header>

      {toast && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {toast}
        </p>
      )}

      <div className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-3">
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

      <div className="rounded-xl border border-stone-200 bg-white/90 px-3">
        {expenses.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500">
            No matching transactions.
          </p>
        ) : (
          expenses.map((e) => (
            <TransactionRow
              key={e.id}
              expense={e}
              onRepeat={() => repeat(e.id)}
              onEdit={() => setEditing(e)}
              onDelete={() => remove(e.id)}
            />
          ))
        )}
      </div>

      <EditTransactionDialog
        expense={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={load}
      />
    </div>
  );
}
