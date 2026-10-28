"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import CategoryPicker from "../CategoryPicker";
import AccountPicker from "../AccountPicker";
import type { PaymentMethod } from "../../lib/types";
import { formatRupee } from "../../lib/utils";
import { apiSend } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import {
  useAccounts,
  useCards,
  useInvalidateMoney,
  useInvestments,
  useRecurring,
} from "../../hooks/useFinanceQueries";

export default function RecurringManager() {
  const { data: rules = [] } = useRecurring();
  const { data: allCards = [] } = useCards();
  const { data: accountData } = useAccounts();
  const { data: investments = [] } = useInvestments();
  const cards = allCards.filter((c) => c.isActive);
  const accounts = accountData?.accounts ?? [];
  const qc = useQueryClient();
  const invalidateMoney = useInvalidateMoney();

  const [kind, setKind] = useState<"spend" | "income" | "invest">("spend");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [payee, setPayee] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [cardId, setCardId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [investmentId, setInvestmentId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [totalMonths, setTotalMonths] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (accountId) return;
    const first = accounts.find((a) => a.isActive);
    if (first) setAccountId(first.id);
  }, [accounts, accountId]);

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.recurring }),
      qc.invalidateQueries({ queryKey: queryKeys.pendings }),
      invalidateMoney(),
    ]);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiSend("/api/recurring", "POST", {
        kind,
        title,
        amount: parseFloat(amount),
        category,
        paymentMethod: kind === "spend" ? method : null,
        cardId: kind === "spend" && method === "CC" ? cardId : null,
        accountId: kind === "spend" && method === "CC" ? null : accountId,
        investmentId: kind === "invest" ? investmentId : null,
        payee: payee || null,
        dayOfMonth: parseInt(dayOfMonth, 10),
        totalMonths: totalMonths ? parseInt(totalMonths, 10) : null,
      });
      setTitle("");
      setAmount("");
      setPayee("");
      setTotalMonths("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(rule: { id: string; isActive: boolean }) {
    await apiSend(`/api/recurring/${rule.id}`, "PATCH", {
      isActive: !rule.isActive,
    });
    await refresh();
  }

  async function remove(rule: { id: string; title: string }) {
    if (!confirm(`Delete rule “${rule.title}”?`)) return;
    await apiSend(`/api/recurring/${rule.id}`, "DELETE");
    await refresh();
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 dark:border-stone-700 dark:bg-stone-900/90 p-4">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 ">Recurring</h2>
      <p className="text-sm text-stone-600 dark:text-stone-400 ">
        Spend, salary, or a monthly SIP / RD cut. It stays pending until you mark Paid.
      </p>

      <form onSubmit={add} className="space-y-3 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {(["spend", "income", "invest"] as const).map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={kind === k ? "default" : "outline"}
              onClick={() => setKind(k)}
            >
              {k === "spend" ? "Spend" : k === "income" ? "Income" : "Invest"}
            </Button>
          ))}
        </div>
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
        {kind !== "invest" && (
          <div>
            <Label>Category</Label>
            <div className="mt-2">
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
          </div>
        )}
        {kind === "spend" && (
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
        )}
        {kind === "spend" && method === "CC" && (
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
        {kind === "invest" && (
          <div>
            <Label>Holding</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900"
              value={investmentId}
              onChange={(e) => setInvestmentId(e.target.value)}
              required
            >
              <option value="">Pick an investment</option>
              {investments.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {(kind !== "spend" || method !== "CC") && (
          <div>
            <Label>{kind === "income" ? "Into account" : "From account"}</Label>
            <div className="mt-2">
              <AccountPicker
                accounts={accounts}
                value={accountId}
                onChange={setAccountId}
              />
            </div>
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
        <Button
          type="submit"
          disabled={
            saving ||
            (kind === "spend" && method === "CC" && !cardId) ||
            (kind === "invest" && !investmentId)
          }
        >
          {saving ? "Saving…" : "Add rule"}
        </Button>
      </form>

      <ul className="divide-y divide-stone-100">
        {rules.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-2 py-3 text-sm">
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100 ">
                {r.title}{" "}
                <span className="font-normal text-stone-500 dark:text-stone-400 ">
                  {formatRupee(r.amount)}
                </span>
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 ">
                Day {r.dayOfMonth}
                {r.investmentId
                  ? " · invest"
                  : r.type === "CREDIT"
                    ? " · income"
                    : ""}
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
          <li className="py-4 text-sm text-stone-500 dark:text-stone-400 ">No recurring rules yet.</li>
        )}
      </ul>
    </section>
  );
}
