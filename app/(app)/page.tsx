"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Button } from "../../components/ui/button";
import TransactionRow from "../../components/TransactionRow";
import type { SummaryResponse } from "../../lib/types";
import { formatRupee } from "../../lib/utils";

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/summary");
    if (res.ok) setSummary(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  if (!summary) {
    return <p className="text-stone-600">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Dashboard
          </h1>
          <p className="text-sm text-stone-600">Cash & UPI balance · cards separate</p>
        </div>
        <Button asChild size="sm">
          <Link href="/add">Add</Link>
        </Button>
      </header>

      {toast && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {toast}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Spent today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatRupee(summary.spentToday)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Main balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatRupee(summary.mainBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This month</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-stone-500">Credited</p>
            <p className="font-semibold text-emerald-700">
              {formatRupee(summary.month.credited)}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Cash/UPI</p>
            <p className="font-semibold">{formatRupee(summary.month.spentCashUpi)}</p>
          </div>
          <div>
            <p className="text-stone-500">Cards</p>
            <p className="font-semibold">{formatRupee(summary.month.spentCc)}</p>
          </div>
        </CardContent>
      </Card>

      {summary.cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cards this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.cards.map((c) => (
              <div key={c.id} className="flex justify-between text-sm">
                <span>
                  {c.name}
                  {c.last4 ? ` ·${c.last4}` : ""}
                </span>
                <span className="font-medium">{formatRupee(c.spentThisMonth)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {summary.budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budgets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.budgets.map((b) => {
              const pct = Math.min(100, (b.spent / b.limit) * 100);
              return (
                <div key={b.category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{b.category}</span>
                    <span>
                      {formatRupee(b.spent)} / {formatRupee(b.limit)}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent</CardTitle>
          <Link href="/activity" className="text-xs text-emerald-800 underline">
            See all
          </Link>
        </CardHeader>
        <CardContent>
          {summary.recent.length === 0 ? (
            <p className="text-sm text-stone-500">No transactions yet.</p>
          ) : (
            summary.recent.map((e) => (
              <TransactionRow
                key={e.id}
                expense={e}
                onRepeat={() => repeat(e.id)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
