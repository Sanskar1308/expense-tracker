"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import UndoToast from "../../../components/UndoToast";
import { formatRupee } from "../../../lib/utils";
import {
  usePayPending,
  usePendings,
  useSkipPending,
  useUndoPayPending,
} from "../../../hooks/useFinanceQueries";

type Pending = {
  id: string;
  title: string;
  amount: number;
  payee: string | null;
  dueDate: string;
  status: "PENDING" | "PAID" | "SKIPPED";
  paymentMethod: string | null;
  paidCount: number;
  totalMonths: number | null;
};

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DuesPage() {
  const { data: items = [], isPending } = usePendings();
  const payMutation = usePayPending();
  const skipMutation = useSkipPending();
  const undoMutation = useUndoPayPending();

  const [undo, setUndo] = useState<{ id: string } | null>(null);
  const [paying, setPaying] = useState<Pending | null>(null);
  const [dateMode, setDateMode] = useState<"today" | "custom">("today");
  const [customDate, setCustomDate] = useState("");

  function openPay(p: Pending) {
    setPaying(p);
    setDateMode("today");
    setCustomDate(toDateInputValue(new Date(p.dueDate)));
  }

  async function confirmPay() {
    if (!paying) return;
    const paidAt =
      dateMode === "today" ? toDateInputValue(new Date()) : customDate;
    if (!paidAt) return;

    try {
      await payMutation.mutateAsync({ id: paying.id, paidAt });
      const id = paying.id;
      setPaying(null);
      setUndo({ id });
      setTimeout(() => setUndo((u) => (u?.id === id ? null : u)), 8000);
    } catch {
      /* mutation error surfaced via disabled/retry */
    }
  }

  async function skip(id: string) {
    await skipMutation.mutateAsync(id);
  }

  async function undoPay(id: string) {
    await undoMutation.mutateAsync(id);
  }

  const pending = items.filter((i) => i.status === "PENDING");
  const done = items.filter((i) => i.status !== "PENDING").slice(0, 10);

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 md:text-3xl">
            Dues
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Pending until you mark Paid — nothing hits the ledger early.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/more">Manage rules</Link>
        </Button>
      </header>

      <section className="rounded-xl border border-stone-200 bg-white/90 px-3 dark:border-stone-700 dark:bg-stone-900/90 md:px-4">
        <h2 className="pt-3 text-sm font-medium text-stone-600 dark:text-stone-400">
          Pending
        </h2>
        {isPending ? (
          <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            Loading…
          </p>
        ) : pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            No pending dues. Add a recurring rule in More.
          </p>
        ) : (
          pending.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 py-3 last:border-0 dark:border-stone-800"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  {p.title}
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                  {p.payee && <Badge>To: {p.payee}</Badge>}
                  {p.paymentMethod && (
                    <Badge variant="default">{p.paymentMethod}</Badge>
                  )}
                  <span>
                    Due{" "}
                    {new Date(p.dueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {p.totalMonths != null && (
                    <span>
                      EMI {p.paidCount}/{p.totalMonths}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="font-semibold">{formatRupee(p.amount)}</p>
                <div className="flex gap-1">
                  <Button size="sm" type="button" onClick={() => openPay(p)}>
                    Paid
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => skip(p.id)}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {done.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white/90 px-3 dark:border-stone-700 dark:bg-stone-900/90 md:px-4">
          <h2 className="pt-3 text-sm font-medium text-stone-600 dark:text-stone-400">
            Recent
          </h2>
          {done.map((p) => (
            <div
              key={p.id}
              className="flex justify-between border-b border-stone-100 py-2 text-sm last:border-0 dark:border-stone-800"
            >
              <span className="text-stone-700 dark:text-stone-300">
                {p.title}{" "}
                <span className="text-stone-400">· {p.status}</span>
              </span>
              <span>{formatRupee(p.amount)}</span>
            </div>
          ))}
        </section>
      )}

      <Dialog
        open={!!paying}
        onOpenChange={(open) => {
          if (!open) setPaying(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {paying?.title} · {paying ? formatRupee(paying.amount) : ""}
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Payment date
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={dateMode === "today" ? "default" : "outline"}
                onClick={() => setDateMode("today")}
              >
                Today
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dateMode === "custom" ? "default" : "outline"}
                onClick={() => setDateMode("custom")}
              >
                Change date
              </Button>
            </div>

            {dateMode === "custom" && (
              <div>
                <Label htmlFor="paid-at">Date</Label>
                <Input
                  id="paid-at"
                  type="date"
                  className="mt-1"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Starts at due date — change to any day the money left.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaying(null)}
                disabled={payMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmPay()}
                disabled={
                  payMutation.isPending ||
                  (dateMode === "custom" && !customDate)
                }
              >
                {payMutation.isPending ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {undo && (
        <UndoToast
          message="Marked as paid"
          onUndo={() => undoPay(undo.id)}
          onDismiss={() => setUndo(null)}
        />
      )}
    </div>
  );
}
