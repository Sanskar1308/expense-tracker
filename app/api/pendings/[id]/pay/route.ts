import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/session-user";

type Params = { params: Promise<{ id: string }> };

function parsePaidAt(value: unknown): Date | null {
  if (value == null || value === "") return new Date();
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export async function POST(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const paidAt = parsePaidAt(body.paidAt);
  if (!paidAt) {
    return NextResponse.json(
      { error: "paidAt must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const pending = await prisma.pendingPayment.findFirst({
    where: { id, userId: user.id },
    include: { rule: true },
  });
  if (!pending) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (pending.status !== "PENDING") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        userId: user.id,
        title: pending.title,
        amount: pending.amount,
        category: pending.category,
        type: pending.type,
        paymentMethod: pending.paymentMethod,
        cardId: pending.cardId,
        createdAt: paidAt,
      },
    });

    const updated = await tx.pendingPayment.update({
      where: { id },
      data: { status: "PAID", expenseId: expense.id },
    });

    const paidCount = await tx.pendingPayment.count({
      where: { ruleId: pending.ruleId, status: "PAID" },
    });

    if (
      pending.rule.totalMonths != null &&
      paidCount >= pending.rule.totalMonths
    ) {
      await tx.recurringRule.update({
        where: { id: pending.ruleId },
        data: { isActive: false },
      });
    }

    return { pending: updated, expense, paidCount };
  });

  return NextResponse.json(result);
}
