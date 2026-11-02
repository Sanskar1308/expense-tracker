import type { Prisma } from "@prisma/client";
import { utcNoon } from "./due-dates";

/** Blank means no date. YYYY-MM-DD otherwise. */
export function parseDueDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Invalid due date");
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new Error("Invalid due date");
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = utcNoon(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Invalid due date");
  }
  return date;
}

/** One unpaid due for money already counted on the holding. Not a monthly rule. */
export async function createOwedDue(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    investmentId: string;
    title: string;
    amount: number;
    fromWhom: string;
    dueDate: Date | null;
  }
) {
  const rule = await tx.recurringRule.create({
    data: {
      userId: input.userId,
      title: input.title,
      amount: input.amount,
      category: "DUE",
      type: "DEBIT",
      investmentId: input.investmentId,
      payee: input.fromWhom,
      dayOfMonth: 1,
      totalMonths: 1,
      isActive: false,
    },
  });
  await tx.pendingPayment.create({
    data: {
      title: input.title,
      amount: input.amount,
      category: "DUE",
      type: "DEBIT",
      investmentId: input.investmentId,
      payee: input.fromWhom,
      dueDate: input.dueDate,
      status: "PENDING",
      rule: { connect: { id: rule.id } },
      user: { connect: { id: input.userId } },
    },
  });
}
