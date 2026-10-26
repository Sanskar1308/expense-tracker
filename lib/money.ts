export type TxRow = {
  type: "CREDIT" | "DEBIT";
  amount: number;
  paymentMethod: "CASH" | "UPI" | "CC" | null;
  cardId: string | null;
  createdAt: Date;
  category: string;
};

export function getMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function computeMainBalance(rows: TxRow[]): number {
  let credits = 0;
  let debits = 0;
  for (const r of rows) {
    if (r.type === "CREDIT") credits += r.amount;
    else if (r.paymentMethod === "CASH" || r.paymentMethod === "UPI") {
      debits += r.amount;
    }
  }
  return credits - debits;
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfMonth(monthKey: string): Date {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1, 0, 0, 0, 0);
}

export function endOfMonth(monthKey: string): Date {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0, 23, 59, 59, 999);
}

export function validateTransactionPayload(body: {
  title?: string;
  amount?: number;
  category?: string;
  type?: string;
  paymentMethod?: string | null;
  cardId?: string | null;
}): string | null {
  if (!body.title?.trim()) return "Title required";
  if (body.amount == null || !(Number(body.amount) > 0)) {
    return "Positive amount required";
  }
  if (!body.category) return "Category required";
  if (body.type !== "CREDIT" && body.type !== "DEBIT") return "Invalid type";
  if (body.type === "DEBIT") {
    if (
      !body.paymentMethod ||
      !["CASH", "UPI", "CC"].includes(body.paymentMethod)
    ) {
      return "Payment method required for debit";
    }
    if (body.paymentMethod === "CC" && !body.cardId) {
      return "Card required for CC";
    }
  }
  return null;
}
