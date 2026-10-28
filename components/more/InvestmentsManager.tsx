"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { formatRupee } from "../../lib/utils";
import { apiSend } from "../../lib/api-client";
import { INVESTMENT_KINDS, type InvestmentRow } from "../../lib/types";
import {
  useAccounts,
  useInvestments,
  useInvalidateMoney,
} from "../../hooks/useFinanceQueries";

function kindLabel(kind: string) {
  return INVESTMENT_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

export default function InvestmentsManager() {
  const { data: rows = [] } = useInvestments();
  const { data: accountData } = useAccounts();
  const invalidate = useInvalidateMoney();
  const accounts = (accountData?.accounts ?? []).filter((a) => a.isActive);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<InvestmentRow["kind"]>("MF");
  const [invested, setInvested] = useState("");
  const [current, setCurrent] = useState("");
  const [grams, setGrams] = useState("");
  const [schedule, setSchedule] = useState<"once" | "monthly">("once");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [totalMonths, setTotalMonths] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const asksSchedule = kind === "MF" || kind === "RD";
  const tracksGrams = kind === "GOLD" || kind === "SILVER";

  function changeKind(next: InvestmentRow["kind"]) {
    setKind(next);
    setSchedule(next === "RD" ? "monthly" : "once");
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const investedAmount = invested === "" ? 0 : parseFloat(invested);
    try {
      await apiSend("/api/investments", "POST", {
        name,
        kind,
        investedAmount,
        currentValue: current === "" ? investedAmount : parseFloat(current),
        grams: tracksGrams && grams !== "" ? parseFloat(grams) : null,
        schedule: asksSchedule ? schedule : "once",
        monthlyAmount: schedule === "monthly" ? parseFloat(monthlyAmount) : null,
        dayOfMonth: parseInt(dayOfMonth, 10),
        totalMonths: totalMonths ? parseInt(totalMonths, 10) : null,
      });
      setName("");
      setInvested("");
      setCurrent("");
      setGrams("");
      setMonthlyAmount("");
      setTotalMonths("");
      setMessage(schedule === "monthly" && asksSchedule ? "Added. The cut is in Dues." : "Added");
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90">
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Investments
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Mutual fund, stock, FD, RD, PPF, gold. For a mutual fund or RD, choose
          one time or SIP. A SIP shows under Dues each month. You pick the
          account when you mark it paid.
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <Holding
            key={row.id}
            row={row}
            accounts={accounts}
            onChange={invalidate}
          />
        ))}
        {rows.length === 0 && (
          <li className="text-sm text-stone-500">No holdings yet.</li>
        )}
      </ul>

      <form onSubmit={add} className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nifty 50 SIP"
              required
            />
          </div>
          <div>
            <Label>Kind</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900"
              value={kind}
              onChange={(e) => changeKind(e.target.value as InvestmentRow["kind"])}
            >
              {INVESTMENT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Already invested</Label>
            <Input
              className="mt-1"
              type="number"
              min="0"
              step="0.01"
              value={invested}
              onChange={(e) => setInvested(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Value today</Label>
            <Input
              className="mt-1"
              type="number"
              min="0"
              step="0.01"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Same as invested if blank"
            />
          </div>
        </div>
        {tracksGrams && (
          <div>
            <Label>Grams</Label>
            <Input
              className="mt-1"
              type="number"
              min="0"
              step="0.001"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              placeholder="Optional"
            />
          </div>
        )}
        {asksSchedule && (
          <div className="space-y-2">
            <Label>{kind === "RD" ? "RD" : "Mutual fund"}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={schedule === "once" ? "default" : "outline"}
                onClick={() => setSchedule("once")}
              >
                One time
              </Button>
              <Button
                type="button"
                size="sm"
                variant={schedule === "monthly" ? "default" : "outline"}
                onClick={() => setSchedule("monthly")}
              >
                {kind === "RD" ? "Every month" : "SIP"}
              </Button>
            </div>
            {schedule === "monthly" && (
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Label>Every month</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="1"
                    step="0.01"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Day</Label>
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
                  <Label>Months</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={1}
                    value={totalMonths}
                    onChange={(e) => setTotalMonths(e.target.value)}
                    placeholder="Open"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <Button type="submit">Add holding</Button>
      </form>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

function Holding({
  row,
  accounts,
  onChange,
}: {
  row: InvestmentRow;
  accounts: { id: string; name: string }[];
  onChange: () => Promise<unknown>;
}) {
  const [value, setValue] = useState(String(row.currentValue));
  const [grams, setGrams] = useState(row.grams == null ? "" : String(row.grams));
  const tracksGrams = row.kind === "GOLD" || row.kind === "SILVER";
  useEffect(() => {
    setValue(String(row.currentValue));
    setGrams(row.grams == null ? "" : String(row.grams));
  }, [row.currentValue, row.grams]);
  const [amount, setAmount] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);
  const [error, setError] = useState("");
  const gain = row.currentValue - row.investedAmount;

  async function saveValue() {
    setError("");
    try {
      await apiSend(`/api/investments/${row.id}`, "PATCH", {
        currentValue: parseFloat(value),
        ...(tracksGrams
          ? { grams: grams === "" ? null : parseFloat(grams) }
          : {}),
      });
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function startMonthly(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiSend("/api/recurring", "POST", {
        kind: "invest",
        title: row.name,
        amount: parseFloat(monthlyAmount),
        investmentId: row.id,
        dayOfMonth: parseInt(dayOfMonth, 10),
      });
      setMonthlyAmount("");
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiSend("/api/moves", "POST", {
        fromAccountId: accountId,
        investmentId: row.id,
        amount: parseFloat(amount),
      });
      setAmount("");
      await onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove() {
    if (!confirm(`Delete ${row.name}? Money already moved comes back to the accounts.`)) {
      return;
    }
    await apiSend(`/api/investments/${row.id}`, "DELETE");
    await onChange();
  }

  return (
    <li className="space-y-2 rounded-lg border border-stone-100 p-3 dark:border-stone-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-stone-900 dark:text-stone-100">
            {row.name}{" "}
            <span className="text-xs font-normal text-stone-500">
              {kindLabel(row.kind)}
            </span>
          </p>
          <p className="text-xs text-stone-500">
            Invested {formatRupee(row.investedAmount)} · now{" "}
            {formatRupee(row.currentValue)} ·{" "}
            <span className={gain >= 0 ? "text-emerald-700" : "text-rose-700"}>
              {gain >= 0 ? "+" : ""}
              {formatRupee(gain)}
            </span>
            {row.grams != null ? ` · ${row.grams} g` : ""}
            {row.monthly
              ? ` · ${row.kind === "RD" ? "RD" : "SIP"} ${formatRupee(row.monthly.amount)} on day ${row.monthly.dayOfMonth}`
              : ""}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={remove}>
          Delete
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label>Value today</Label>
          <Input
            className="mt-1 w-36"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        {tracksGrams && (
          <div>
            <Label>Grams</Label>
            <Input
              className="mt-1 w-28"
              type="number"
              min="0"
              step="0.001"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>
        )}
        <Button type="button" size="sm" variant="outline" onClick={saveValue}>
          Update
        </Button>
      </div>
      {(row.kind === "MF" || row.kind === "RD") && !row.monthly && (
        <form onSubmit={startMonthly} className="flex flex-wrap items-end gap-2">
          <div>
            <Label>SIP each month</Label>
            <Input
              className="mt-1 w-32"
              type="number"
              min="1"
              step="0.01"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Day</Label>
            <Input
              className="mt-1 w-20"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm">
            Add to dues
          </Button>
        </form>
      )}
      {accounts.length > 0 && (
        <form onSubmit={contribute} className="flex flex-wrap items-end gap-2">
          <div>
            <Label>Add from</Label>
            <select
              className="mt-1 flex h-10 rounded-md border border-stone-300 bg-white px-3 text-sm dark:border-stone-600 dark:bg-stone-900"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              className="mt-1 w-32"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </li>
  );
}
