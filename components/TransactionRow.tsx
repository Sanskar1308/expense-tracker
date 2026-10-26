"use client";

import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { Expense } from "../lib/types";
import { formatRupee } from "../lib/utils";

function methodBadge(expense: Expense) {
  if (expense.type === "CREDIT") return <Badge variant="credit">Credit</Badge>;
  if (expense.paymentMethod === "CASH")
    return <Badge variant="cash">Cash</Badge>;
  if (expense.paymentMethod === "UPI") return <Badge variant="upi">UPI</Badge>;
  if (expense.paymentMethod === "CC") {
    return (
      <Badge variant="cc">
        CC{expense.card?.name ? ` · ${expense.card.name}` : ""}
      </Badge>
    );
  }
  return null;
}

export default function TransactionRow({
  expense,
  onRepeat,
  onEdit,
  onDelete,
  compact,
}: {
  expense: Expense;
  onRepeat?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const isCredit = expense.type === "CREDIT";
  const date = new Date(expense.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-start justify-between gap-3 border-b border-stone-100 py-3 last:border-0">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium text-stone-900">{expense.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {methodBadge(expense)}
          <Badge>{expense.category}</Badge>
          <span className="text-xs text-stone-500">{date}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <p
          className={
            isCredit
              ? "font-semibold text-emerald-700"
              : "font-semibold text-stone-900"
          }
        >
          {isCredit ? "+" : "-"}
          {formatRupee(expense.amount)}
        </p>
        {!compact && (
          <div className="flex gap-1">
            {onRepeat && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Repeat today"
                onClick={onRepeat}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Edit"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Delete"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
