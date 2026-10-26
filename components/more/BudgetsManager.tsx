"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CATEGORIES, type CategoryType } from "../../lib/types";

type BudgetRow = { category: CategoryType; amount: number };

export default function BudgetsManager() {
  const [month, setMonth] = useState("");
  const [amounts, setAmounts] = useState<Record<CategoryType, string>>({
    FOOD: "",
    TRANSPORT: "",
    UTILITIES: "",
    ENTERTAINMENT: "",
    OTHER: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/budgets")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.month) return;
        setMonth(data.month);
        const next = { ...amounts };
        for (const c of CATEGORIES) next[c.value] = "";
        for (const b of data.budgets as BudgetRow[]) {
          next[b.category] = String(b.amount);
        }
        setAmounts(next);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const items = CATEGORIES.map((c) => ({
        category: c.value,
        amount: parseFloat(amounts[c.value] || "0") || 0,
      })).filter((i) => i.amount > 0);

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
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Budgets</h2>
        <p className="text-sm text-stone-600">
          Month {month || "…"} · leave blank to skip a category
        </p>
      </div>
      <div className="space-y-2">
        {CATEGORIES.map((c) => (
          <div key={c.value} className="flex items-center gap-3">
            <label className="w-28 text-sm text-stone-700">{c.label}</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={amounts[c.value]}
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
