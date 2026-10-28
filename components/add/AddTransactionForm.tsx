"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import CategoryPicker from "../CategoryPicker";
import AccountPicker from "../AccountPicker";
import {
  COMMON_TITLES,
  type PaymentMethod,
  type TransactionType,
} from "../../lib/types";
import { cn } from "../../lib/utils";
import {
  useAccounts,
  useCards,
  useCreateExpense,
} from "../../hooks/useFinanceQueries";

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
  const [category, setCategory] = useState("OTHER");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cardId, setCardId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [message, setMessage] = useState("");
  const { data: cards = [] } = useCards();
  const { data: accountData } = useAccounts();
  const accounts = Array.isArray(accountData?.accounts)
    ? accountData.accounts
    : [];
  const createExpense = useCreateExpense();
  const activeAccounts = accounts.filter((a) => a.isActive);
  const selectedAccountId =
    accountId || activeAccounts[0]?.id || "";

  useEffect(() => {
    amountRef.current?.focus();
    const savedMethod = localStorage.getItem(STORAGE_METHOD) as PaymentMethod | null;
    const savedCard = localStorage.getItem(STORAGE_CARD);
    if (savedMethod === "CASH" || savedMethod === "UPI" || savedMethod === "CC") {
      setPaymentMethod(savedMethod);
    }
    if (savedCard) setCardId(savedCard);
  }, []);

  const activeCards = Array.isArray(cards)
    ? cards.filter((c) => c.isActive)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const payload = {
        title,
        amount: parseFloat(amount),
        category,
        type,
        paymentMethod: type === "CREDIT" ? null : paymentMethod,
        cardId: type === "DEBIT" && paymentMethod === "CC" ? cardId : null,
        accountId:
          type === "DEBIT" && paymentMethod === "CC"
            ? null
            : selectedAccountId || null,
      };

      const needsAccount =
        activeAccounts.length > 0 &&
        !(type === "DEBIT" && paymentMethod === "CC");
      if (needsAccount && !selectedAccountId) {
        setMessage("Pick an account.");
        return;
      }

      if (type === "DEBIT" && paymentMethod === "CC" && !cardId) {
        setMessage("Add a card in More, or pick one.");
        return;
      }

      await createExpense.mutateAsync(payload);

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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
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

      {activeAccounts.length > 0 &&
        (type === "CREDIT" || paymentMethod !== "CC") && (
          <div className="space-y-2">
            <Label>Account</Label>
            <AccountPicker
              accounts={activeAccounts}
              value={selectedAccountId}
              onChange={setAccountId}
            />
          </div>
        )}

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
        <div className="mt-2">
          <CategoryPicker value={category} onChange={setCategory} />
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
          createExpense.isPending ||
          (type === "DEBIT" && paymentMethod === "CC" && activeCards.length === 0)
        }
      >
        {createExpense.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
