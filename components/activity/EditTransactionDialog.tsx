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
import CategoryPicker from "../CategoryPicker";
import AccountPicker from "../AccountPicker";
import {
  type Expense,
  type PaymentMethod,
  type TransactionType,
} from "../../lib/types";
import {
  useAccounts,
  useCards,
  useUpdateExpense,
} from "../../hooks/useFinanceQueries";

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
  const { data: cards = [] } = useCards();
  const { data: accountData } = useAccounts();
  const accounts = accountData?.accounts ?? [];
  const updateExpense = useUpdateExpense();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("DEBIT");
  const [category, setCategory] = useState("OTHER");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cardId, setCardId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!expense) return;
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setType(expense.type);
    setCategory(expense.category);
    setPaymentMethod(expense.paymentMethod ?? "CASH");
    setCardId(expense.cardId ?? "");
    setAccountId(expense.accountId ?? "");
    setError("");
  }, [expense]);

  async function save() {
    if (!expense) return;
    setError("");
    try {
      await updateExpense.mutateAsync({
        id: expense.id,
        body: {
          title,
          amount: parseFloat(amount),
          category,
          type,
          paymentMethod: type === "CREDIT" ? null : paymentMethod,
          cardId: type === "DEBIT" && paymentMethod === "CC" ? cardId : null,
          accountId:
            type === "DEBIT" && paymentMethod === "CC" ? null : accountId || null,
        },
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
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
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
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
          {accounts.some((a) => a.isActive) &&
            (type === "CREDIT" || paymentMethod !== "CC") && (
              <div>
                <Label>Account</Label>
                <div className="mt-2">
                  <AccountPicker
                    accounts={accounts}
                    value={accountId}
                    onChange={setAccountId}
                  />
                </div>
              </div>
            )}
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
          <div>
            <Label>Category</Label>
            <div className="mt-2">
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className="w-full"
            onClick={save}
            disabled={updateExpense.isPending}
          >
            {updateExpense.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
