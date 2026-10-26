"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import UndoToast from "../../../components/UndoToast";
import { formatRupee } from "../../../lib/utils";

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

export default function DuesPage() {
  const [items, setItems] = useState<Pending[]>([]);
  const [undo, setUndo] = useState<{ id: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/pendings");
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pay(id: string) {
    const res = await fetch(`/api/pendings/${id}/pay`, { method: "POST" });
    if (res.ok) {
      setUndo({ id });
      load();
      setTimeout(() => setUndo((u) => (u?.id === id ? null : u)), 8000);
    }
  }

  async function skip(id: string) {
    await fetch(`/api/pendings/${id}/skip`, { method: "POST" });
    load();
  }

  async function undoPay(id: string) {
    await fetch(`/api/pendings/${id}/undo-pay`, { method: "POST" });
    load();
  }

  const pending = items.filter((i) => i.status === "PENDING");
  const done = items.filter((i) => i.status !== "PENDING").slice(0, 10);

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 md:text-3xl">
            Dues
          </h1>
          <p className="text-sm text-stone-600">
            Pending until you mark Paid — nothing hits the ledger early.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/more">Manage rules</Link>
        </Button>
      </header>

      <section className="rounded-xl border border-stone-200 bg-white/90 px-3 md:px-4">
        <h2 className="pt-3 text-sm font-medium text-stone-600">Pending</h2>
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500">
            No pending dues. Add a recurring rule in More.
          </p>
        ) : (
          pending.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 py-3 last:border-0"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-stone-900">{p.title}</p>
                <div className="flex flex-wrap gap-1.5 text-xs text-stone-500">
                  {p.payee && <Badge>To: {p.payee}</Badge>}
                  {p.paymentMethod && <Badge variant="default">{p.paymentMethod}</Badge>}
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
                  <Button size="sm" type="button" onClick={() => pay(p.id)}>
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
        <section className="rounded-xl border border-stone-200 bg-white/90 px-3 md:px-4">
          <h2 className="pt-3 text-sm font-medium text-stone-600">Recent</h2>
          {done.map((p) => (
            <div
              key={p.id}
              className="flex justify-between border-b border-stone-100 py-2 text-sm last:border-0"
            >
              <span className="text-stone-700">
                {p.title}{" "}
                <span className="text-stone-400">· {p.status}</span>
              </span>
              <span>{formatRupee(p.amount)}</span>
            </div>
          ))}
        </section>
      )}

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
