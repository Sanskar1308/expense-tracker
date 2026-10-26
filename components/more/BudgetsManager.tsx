"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import CategoryPicker from "../CategoryPicker";
import type { CategoryOption } from "../../lib/categories";
import { DEFAULT_CATEGORIES } from "../../lib/categories";

type BudgetRow = { category: string; amount: number };

export default function BudgetsManager() {
  const [month, setMonth] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, custom: false }))
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const applyCategories = useCallback((cats: CategoryOption[], budgets?: BudgetRow[]) => {
    setCategories(cats);
    setAmounts((prev) => {
      const next: Record<string, string> = {};
      for (const c of cats) next[c.value] = prev[c.value] ?? "";
      if (budgets) {
        for (const b of budgets) next[b.category] = String(b.amount);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/budgets").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([budgetData, categoryData]) => {
        const cats: CategoryOption[] = Array.isArray(categoryData.categories)
          ? categoryData.categories
          : DEFAULT_CATEGORIES.map((c) => ({ ...c, custom: false }));
        if (budgetData?.month) setMonth(budgetData.month);
        applyCategories(cats, budgetData?.budgets);
      })
      .catch(() => undefined);
  }, [applyCategories]);

  async function refreshCategories() {
    const res = await fetch("/api/categories");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.categories)) applyCategories(data.categories);
  }

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

      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, items }),
      });
      if (res.ok) setMessage("Budgets saved");
      else setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 dark:border-stone-700 dark:bg-stone-900/90 p-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 ">Budgets</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 ">
          Month {month || "…"} · leave blank to skip a category
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm text-stone-600 dark:text-stone-400 ">Need another category?</p>
        <CategoryPicker value="" onChange={() => refreshCategories()} />
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.value} className="flex items-center gap-3">
            <label className="w-28 shrink-0 text-sm text-stone-700">{c.label}</label>
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
