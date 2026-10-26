"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import CategoryPicker from "../CategoryPicker";
import { DEFAULT_CATEGORIES } from "../../lib/categories";
import { apiSend } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { useBudgets, useCategories } from "../../hooks/useFinanceQueries";

export default function BudgetsManager() {
  const { data: budgetData } = useBudgets();
  const { data: categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    custom: false as boolean | undefined,
  })) } = useCategories();
  const qc = useQueryClient();

  const month = budgetData?.month ?? "";
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!budgetData && categories.length === 0) return;
    setAmounts((prev) => {
      const next: Record<string, string> = {};
      for (const c of categories) next[c.value] = prev[c.value] ?? "";
      for (const b of budgetData?.budgets ?? []) {
        next[b.category] = String(b.amount);
      }
      return next;
    });
  }, [budgetData, categories]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const items = categories
        .map((c) => ({
          category: c.value,
          amount: parseFloat(amounts[c.value] || "0") || 0,
        }))
        .filter((i) => i.amount > 0);

      await apiSend("/api/budgets", "PUT", { month, items });
      setMessage("Budgets saved");
      await qc.invalidateQueries({ queryKey: queryKeys.budgets() });
    } catch {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90">
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Budgets
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Month {month || "…"} · leave blank to skip a category
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm text-stone-600 dark:text-stone-400">
          Need another category?
        </p>
        <CategoryPicker
          value=""
          onChange={() =>
            qc.invalidateQueries({ queryKey: queryKeys.categories })
          }
        />
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.value} className="flex items-center gap-3">
            <label className="w-28 shrink-0 text-sm text-stone-700 dark:text-stone-300">
              {c.label}
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={amounts[c.value] ?? ""}
              onChange={(e) =>
                setAmounts((prev) => ({ ...prev, [c.value]: e.target.value }))
              }
              placeholder="0"
            />
          </div>
        ))}
      </div>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <Button type="button" onClick={save} disabled={saving || !month}>
        {saving ? "Saving…" : "Save budgets"}
      </Button>
    </section>
  );
}
