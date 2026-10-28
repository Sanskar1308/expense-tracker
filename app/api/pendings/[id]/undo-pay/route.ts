import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/session-user";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const pending = await prisma.pendingPayment.findFirst({
    where: { id, userId: user.id },
  });
  if (!pending) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const move = await prisma.ledgerMove.findUnique({
    where: { pendingId: id },
  });
  if (pending.status !== "PAID" || (!pending.expenseId && !move)) {
    return NextResponse.json({ error: "Nothing to undo" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    if (move) {
      if (move.investmentId) {
        const inv = await tx.investment.findUnique({
          where: { id: move.investmentId },
        });
        if (inv) {
          // ponytail: subtract the cut even if current value was edited after
          await tx.investment.update({
            where: { id: inv.id },
            data: {
              investedAmount: Math.max(0, inv.investedAmount - move.amount),
              currentValue: Math.max(0, inv.currentValue - move.amount),
            },
          });
        }
      }
      await tx.ledgerMove.delete({ where: { id: move.id } });
    }
    if (pending.expenseId) {
      await tx.expense.delete({ where: { id: pending.expenseId } });
    }
    const updated = await tx.pendingPayment.update({
      where: { id },
      data: { status: "PENDING", expenseId: null },
    });
    await tx.recurringRule.update({
      where: { id: pending.ruleId },
      data: { isActive: true },
    });
    return updated;
  });

  return NextResponse.json(result);
}
