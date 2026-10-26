"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  CATEGORIES,
  COMMON_TITLES,
  type CategoryType,
  type CreditCard,
  type PaymentMethod,
  type TransactionType,
} from "../../lib/types";
import { cn } from "../../lib/utils";

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];
const STORAGE_METHOD = "et_last_payment_method";
const STORAGE_CARD = "et_last_card_id";

export default function AddTransactionForm({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TransactionType>("DEBIT");
  const [category, setCategory] = useState<CategoryType>("OTHER");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cardId, setCardId] = useState("");
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    amountRef.current?.focus();
    const savedMethod = localStorage.getItem(STORAGE_METHOD) as PaymentMethod | null;
    const savedCard = localStorage.getItem(STORAGE_CARD);
    if (savedMethod === "CASH" || savedMethod === "UPI" || savedMethod === "CC") {
      setPaymentMethod(savedMethod);
    }
    if (savedCard) setCardId(savedCard);

    fetch("/api/cards")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCards(data.filter((c: CreditCard) => c.isActive));
        }
      })
      .catch(() => undefined);
  }, []);

  const activeCards = cards;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      const payload = {
        title,
        amount: parseFloat(amount),
        category,
        type,
        paymentMethod: type === "CREDIT" ? null : paymentMethod,
        cardId: type === "DEBIT" && paymentMethod === "CC" ? cardId : null,
      };

      if (type === "DEBIT" && paymentMethod === "CC" && !cardId) {
        setMessage("Add a card in More, or pick one.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || "Failed to save");
        return;
      }

      if (type === "DEBIT") {
        localStorage.setItem(STORAGE_METHOD, paymentMethod);
        if (paymentMethod === "CC" && cardId) {
          localStorage.setItem(STORAGE_CARD, cardId);
        }
      }

      setAmount("");
      setTitle("");
      setMessage("Saved");
      onSaved?.();
      amountRef.current?.focus();
    } catch {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          ref={amountRef}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 h-14 text-3xl font-semibold tracking-tight"
          placeholder="0"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setAmount(String(n))}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["DEBIT", "CREDIT"] as TransactionType[]).map((t) => (
          <Button
            key={t}
            type="button"
            variant={type === t ? "default" : "outline"}
            onClick={() => setType(t)}
          >
            {t === "DEBIT" ? "Debit" : "Credit"}
          </Button>
        ))}
      </div>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
          placeholder="What was this?"
        />
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {Object.keys(COMMON_TITLES).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              onClick={() => {
                setTitle(t);
                setCategory(COMMON_TITLES[t]);
                if (t === "Salary") setType("CREDIT");
              }}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {type === "DEBIT" && (
        <div className="space-y-3">
          <Label>Payment</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["CASH", "UPI", "CC"] as PaymentMethod[]).map((m) => (
              <Button
                key={m}
                type="button"
                variant={paymentMethod === m ? "default" : "outline"}
                onClick={() => setPaymentMethod(m)}
              >
                {m === "CC" ? "Card" : m === "CASH" ? "Cash" : "UPI"}
              </Button>
            ))}
          </div>
          {paymentMethod === "CC" && (
            <div className="space-y-2">
              {activeCards.length === 0 ? (
                <p className="text-sm text-stone-600">
                  No cards yet.{" "}
                  <Link href="/more" className="text-emerald-800 underline">
                    Add one in More
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeCards.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      size="sm"
                      variant={cardId === c.id ? "default" : "outline"}
                      onClick={() => setCardId(c.id)}
                    >
                      {c.name}
                      {c.last4 ? ` ·${c.last4}` : ""}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <Label>Category</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm",
                category === c.value
                  ? "bg-emerald-700 text-white"
                  : "bg-stone-100 text-stone-800"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p
          className={cn(
            "text-sm",
            message === "Saved" ? "text-emerald-700" : "text-red-600"
          )}
        >
          {message}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={
          saving ||
          (type === "DEBIT" && paymentMethod === "CC" && activeCards.length === 0)
        }
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
