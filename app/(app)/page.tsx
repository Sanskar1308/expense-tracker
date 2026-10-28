"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Button } from "../../components/ui/button";
import TransactionRow from "../../components/TransactionRow";
import DashboardCharts from "../../components/dashboard/DashboardCharts";
import { formatRupee } from "../../lib/utils";
import { categoryLabel } from "../../lib/analytics";
import { formatDueDate } from "../../lib/due-dates";
import {
  useRepeatExpense,
  useSummary,
} from "../../hooks/useFinanceQueries";

export default function DashboardPage() {
  const [toast, setToast] = useState("");
  const [compareMode, setCompareMode] = useState<"week" | "month">("month");
  const { data: summary, isPending, isError, error, refetch } =
    useSummary(compareMode);
  const repeatMutation = useRepeatExpense();

  async function repeat(id: string) {
    try {
      await repeatMutation.mutateAsync(id);
      setToast("Added for today");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Could not repeat");
      setTimeout(() => setToast(""), 2000);
    }
  }

  // Only block first paint — week/month switches reuse cache / placeholder
  if (isPending && !summary) {
    return (
      <p className="text-stone-600 dark:text-stone-400">Loading dashboard…</p>
    );
  }

  if (isError || !summary) {
    return (
      <div className="space-y-3 text-stone-600 dark:text-stone-400">
        <p>{error?.message || "Could not load dashboard"}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 md:text-3xl">
            Dashboard
            {(summary.duesBadge ?? 0) > 0 && (
              <Link
                href="/dues"
                className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white align-middle"
              >
                {summary.duesBadge}
              </Link>
            )}
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 ">
            Accounts, investments, and cards
          </p>
        </div>
        <Button asChild size="sm" className="md:h-10 md:px-5">
          <Link href="/add">Add</Link>
        </Button>
      </header>

      {toast && (
        <p className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          {toast}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>Spent today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold md:text-3xl">
              {formatRupee(summary.spentToday)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Liquid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold md:text-3xl">
              {formatRupee(summary.liquid ?? summary.mainBalance)}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Net worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold md:text-3xl">
              {formatRupee(summary.netWorth ?? summary.mainBalance)}
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Cash {formatRupee(summary.liquid ?? summary.mainBalance)} + investments{" "}
              {formatRupee(summary.investmentsValue ?? 0)} − cards{" "}
              {formatRupee(summary.cardOwed ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle>This month</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center text-sm md:gap-6 md:text-left">
            <div>
              <p className="text-stone-500 dark:text-stone-400 ">Credited</p>
              <p className="text-lg font-semibold text-emerald-700 md:text-2xl">
                {formatRupee(summary.month.credited)}
              </p>
            </div>
            <div>
              <p className="text-stone-500 dark:text-stone-400 ">Cash/UPI</p>
              <p className="text-lg font-semibold md:text-2xl">
                {formatRupee(summary.month.spentCashUpi)}
              </p>
            </div>
            <div>
              <p className="text-stone-500 dark:text-stone-400 ">Cards</p>
              <p className="text-lg font-semibold md:text-2xl">
                {formatRupee(summary.month.spentCc)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!!summary.accounts?.length && (
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.accounts.map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className={a.isActive ? "" : "text-stone-400"}>{a.name}</span>
                <span className="font-medium">{formatRupee(a.balance)}</span>
              </div>
            ))}
            {(summary.unassigned ?? 0) !== 0 && (
              <div className="flex justify-between text-sm">
                <span>Unassigned</span>
                <span className="font-medium">{formatRupee(summary.unassigned ?? 0)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(summary.upcomingDues?.length || summary.cardBills?.length) ? (
        <div className="grid gap-4 md:grid-cols-2">
          {!!summary.upcomingDues?.length && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Upcoming dues</CardTitle>
                <Link href="/dues" className="text-xs text-emerald-800 dark:text-emerald-300 underline">
                  See all
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {summary.upcomingDues.map((d) => (
                  <div key={d.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {d.title}
                      {d.payee ? ` · ${d.payee}` : ""}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatRupee(d.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {!!summary.cardBills?.length && (
            <Card>
              <CardHeader>
                <CardTitle>Card bills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {summary.cardBills.map((b) => (
                  <div key={b.id} className="flex justify-between gap-2">
                    <span>
                      {b.name}
                      {b.dueSoon ? " · due soon" : ""}
                      <span className="block text-xs text-stone-500 dark:text-stone-400 ">
                        Due {formatDueDate(b.dueDate)} ({b.daysLeft}d)
                      </span>
                    </span>
                    <span className="font-medium">{formatRupee(b.owed)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {summary.compare && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>Spend vs last {compareMode}</CardTitle>
            <div className="flex gap-1">
              {(["week", "month"] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  type="button"
                  variant={compareMode === m ? "default" : "outline"}
                  onClick={() => setCompareMode(m)}
                >
                  {m === "week" ? "Week" : "Month"}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-semibold">
                {formatRupee(summary.compare.currentTotal)}
              </p>
              <p
                className={
                  summary.compare.deltaPct > 0
                    ? "text-sm font-medium text-rose-700"
                    : summary.compare.deltaPct < 0
                      ? "text-sm font-medium text-emerald-700"
                      : "text-sm text-stone-500 dark:text-stone-400 "
                }
              >
                {summary.compare.deltaPct > 0 ? "↑" : summary.compare.deltaPct < 0 ? "↓" : "→"}{" "}
                {Math.abs(summary.compare.deltaPct)}% vs{" "}
                {formatRupee(summary.compare.previousTotal)}
              </p>
            </div>
            {summary.compare.movers.length > 0 && (
              <ul className="space-y-1 text-sm text-stone-600 dark:text-stone-400 ">
                {summary.compare.movers.slice(0, 4).map((m) => (
                  <li key={m.category} className="flex justify-between">
                    <span>{m.name}</span>
                    <span>
                      {m.change > 0 ? "+" : ""}
                      {formatRupee(m.change)} ({m.pct > 0 ? "+" : ""}
                      {m.pct}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {!!summary.savingsGoals?.length && (
        <div className="grid gap-4 md:grid-cols-2">
          {summary.savingsGoals.map((goal) => {
            const daysLeft = Math.ceil(
              (new Date(goal.deadline).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000)
            );
            return (
              <Card key={goal.id}>
                <CardHeader>
                  <CardTitle>{goal.title || "Savings goal"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {formatRupee(goal.savedAmount)} /{" "}
                      {formatRupee(goal.targetAmount)}
                    </span>
                    <span>
                      {goal.progressPct.toFixed(0)}% · {daysLeft}d left
                    </span>
                  </div>
                  <Progress value={goal.progressPct} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-4 lg:col-span-2">
          {summary.charts && <DashboardCharts charts={summary.charts} />}
        </div>

        <div className="space-y-4">
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
                    <span className="font-medium">
                      {formatRupee(c.spentThisMonth)}
                    </span>
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
                        <span>{categoryLabel(b.category)}</span>
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
              <Link
                href="/activity"
                className="text-xs text-emerald-800 dark:text-emerald-300 underline"
              >
                See all
              </Link>
            </CardHeader>
            <CardContent>
              {summary.recent.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400 ">No transactions yet.</p>
              ) : (
                summary.recent.map((e) => (
                  <TransactionRow
                    key={e.id}
                    expense={e}
                    onRepeat={e.fromPending ? undefined : () => repeat(e.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
