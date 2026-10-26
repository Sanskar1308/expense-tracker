"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  CATEGORIES,
  type CategoryType,
  type CreditCard,
  type Expense,
  type PaymentMethod,
  type TransactionType,
} from "../../lib/types";

export default function EditTransactionDialog({
  expense,
  open,
  onOpenChange,
  onSaved,
}: {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("DEBIT");
  const [category, setCategory] = useState<CategoryType>("OTHER");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cardId, setCardId] = useState("");
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!expense) return;
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setType(expense.type);
    setCategory(expense.category);
    setPaymentMethod(expense.paymentMethod ?? "CASH");
    setCardId(expense.cardId ?? "");
    setError("");
  }, [expense]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/cards")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCards(data);
      })
      .catch(() => undefined);
  }, [open]);

  async function save() {
    if (!expense) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          category,
          type,
          paymentMethod: type === "CREDIT" ? null : paymentMethod,
          cardId: type === "DEBIT" && paymentMethod === "CC" ? cardId : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Update failed");
        return;
      }
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["DEBIT", "CREDIT"] as TransactionType[]).map((t) => (
              <Button
                key={t}
                type="button"
                variant={type === t ? "default" : "outline"}
                onClick={() => setType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          {type === "DEBIT" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(["CASH", "UPI", "CC"] as PaymentMethod[]).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={paymentMethod === m ? "default" : "outline"}
                    onClick={() => setPaymentMethod(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
              {paymentMethod === "CC" && (
                <div className="flex flex-wrap gap-2">
                  {cards
                    .filter((c) => c.isActive || c.id === cardId)
                    .map((c) => (
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
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button
                key={c.value}
                type="button"
                size="sm"
                variant={category === c.value ? "default" : "outline"}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
