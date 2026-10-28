"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { formatRupee } from "../../lib/utils";
import { apiSend } from "../../lib/api-client";
import { useAccounts, useCards, useInvalidateMoney } from "../../hooks/useFinanceQueries";

export default function AccountsManager() {
  const { data } = useAccounts();
  const { data: cards = [] } = useCards();
  const invalidate = useInvalidateMoney();
  const accounts = data?.accounts ?? [];
  const active = accounts.filter((a) => a.isActive);

  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [fromId, setFromId] = useState("");
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiSend("/api/accounts", "POST", {
        name,
        openingBalance: opening === "" ? 0 : parseFloat(opening),
      });
      setName("");
      setOpening("");
      setMessage("Account added");
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function toggle(id: string, isActive: boolean) {
    await apiSend(`/api/accounts/${id}`, "PATCH", { isActive: !isActive });
    await invalidate();
  }

  async function transfer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const payload: Record<string, unknown> = {
      fromAccountId: fromId,
      amount: parseFloat(amount),
      note: note || null,
    };
    if (dest.startsWith("card:")) payload.cardId = dest.slice(5);
    else payload.toAccountId = dest;
    try {
      await apiSend("/api/moves", "POST", payload);
      setAmount("");
      setNote("");
      setMessage(dest.startsWith("card:") ? "Card bill paid" : "Transferred");
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90">
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Accounts
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Cash, bank, wallet. Opening balance is what is in it today. Transfers
          and card payments stay out of spending.
        </p>
      </div>

      {data && (
        <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
          Liquid {formatRupee(data.liquid)}
          {data.unassigned !== 0
            ? ` · unassigned ${formatRupee(data.unassigned)}`
            : ""}
        </p>
      )}

      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className={a.isActive ? "" : "text-stone-400"}>
              {a.name}
              {a.isActive ? "" : " · hidden"}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-medium">{formatRupee(a.balance)}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => toggle(a.id, a.isActive)}
              >
                {a.isActive ? "Hide" : "Show"}
              </Button>
            </span>
          </li>
        ))}
        {accounts.length === 0 && (
          <li className="py-2 text-sm text-stone-500">No accounts yet.</li>
        )}
      </ul>

      <form onSubmit={addAccount} className="grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div>
          <Label>Name</Label>
          <Input
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="HDFC"
            required
          />
        </div>
        <div>
          <Label>Opening balance</Label>
          <Input
            className="mt-1"
            type="number"
            step="0.01"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder="0"
          />
        </div>
        <Button type="submit">Add account</Button>
      </form>

      {active.length >= 1 && (
        <form onSubmit={transfer} className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
          <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
            Move money
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>From</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                required
              >
                <option value="">Account</option>
                {active.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>To</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                required
              >
                <option value="">Account or card</option>
                {active
                  .filter((a) => a.id !== fromId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                {cards
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={`card:${c.id}`}>
                      Pay {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto] sm:items-end">
            <div>
              <Label>Amount</Label>
              <Input
                className="mt-1"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                className="mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button type="submit">Move</Button>
          </div>
        </form>
      )}

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
