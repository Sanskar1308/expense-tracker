"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import CategoryPicker from "../CategoryPicker";
import type { CreditCard, PaymentMethod } from "../../lib/types";
import { formatRupee } from "../../lib/utils";

type Rule = {
  id: string;
  title: string;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod | null;
  cardId: string | null;
  payee: string | null;
  dayOfMonth: number;
  totalMonths: number | null;
  isActive: boolean;
  paidCount: number;
};

export default function RecurringManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [payee, setPayee] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [cardId, setCardId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [totalMonths, setTotalMonths] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [r, c] = await Promise.all([
      fetch("/api/recurring").then((x) => x.json()),
      fetch("/api/cards").then((x) => x.json()),
    ]);
    if (Array.isArray(r)) setRules(r);
    if (Array.isArray(c)) setCards(c.filter((x: CreditCard) => x.isActive));
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          category,
          type: "DEBIT",
          paymentMethod: method,
          cardId: method === "CC" ? cardId : null,
          payee: payee || null,
          dayOfMonth: parseInt(dayOfMonth, 10),
          totalMonths: totalMonths ? parseInt(totalMonths, 10) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setTitle("");
      setAmount("");
      setPayee("");
      setTotalMonths("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(rule: Rule) {
    await fetch(`/api/recurring/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    load();
  }

  async function remove(rule: Rule) {
    if (!confirm(`Delete rule “${rule.title}”?`)) return;
    await fetch(`/api/recurring/${rule.id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-4">
      <h2 className="text-lg font-semibold text-stone-900">Recurring</h2>
      <p className="text-sm text-stone-600">
        EMI, OTT, rent — creates Pending dues until you mark Paid.
      </p>

      <form onSubmit={add} className="space-y-3 border-b border-stone-100 pb-4">
        <div>
          <Label>Title</Label>
          <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Amount</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Payee (optional)</Label>
            <Input
              className="mt-1"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="Netflix / Bank"
            />
          </div>
        </div>
        <div>
          <Label>Category</Label>
          <div className="mt-2">
            <CategoryPicker value={category} onChange={setCategory} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["CASH", "UPI", "CC"] as PaymentMethod[]).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={method === m ? "default" : "outline"}
              onClick={() => setMethod(m)}
            >
              {m === "CC" ? "Card" : m}
            </Button>
          ))}
        </div>
        {method === "CC" && (
          <div className="flex flex-wrap gap-2">
            {cards.map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant={cardId === c.id ? "default" : "outline"}
                onClick={() => setCardId(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Day of month</Label>
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>EMI months (optional)</Label>
            <Input
              className="mt-1"
              type="number"
              min={1}
              value={totalMonths}
              onChange={(e) => setTotalMonths(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={saving || (method === "CC" && !cardId)}>
          {saving ? "Saving…" : "Add rule"}
        </Button>
      </form>

      <ul className="divide-y divide-stone-100">
        {rules.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-2 py-3 text-sm">
            <div>
              <p className="font-medium text-stone-900">
                {r.title}{" "}
                <span className="font-normal text-stone-500">
                  {formatRupee(r.amount)}
                </span>
              </p>
              <p className="text-xs text-stone-500">
                Day {r.dayOfMonth}
                {r.payee ? ` · ${r.payee}` : ""}
                {r.totalMonths != null
                  ? ` · EMI ${r.paidCount}/${r.totalMonths}`
                  : " · open-ended"}
                {r.isActive ? "" : " · paused"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" type="button" onClick={() => toggle(r)}>
                {r.isActive ? "Pause" : "Resume"}
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => remove(r)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
        {rules.length === 0 && (
          <li className="py-4 text-sm text-stone-500">No recurring rules yet.</li>
        )}
      </ul>
    </section>
  );
}
