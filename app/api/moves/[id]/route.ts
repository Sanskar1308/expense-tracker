import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const move = await prisma.ledgerMove.findFirst({
    where: { id, userId: user.id },
  });
  if (!move) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (move.investmentId) {
      const inv = await tx.investment.findUnique({
        where: { id: move.investmentId },
      });
      if (inv) {
        // ponytail: subtract this add even if the value was edited after
        await tx.investment.update({
          where: { id: inv.id },
          data: {
            investedAmount: Math.max(0, inv.investedAmount - move.amount),
            currentValue: Math.max(0, inv.currentValue - move.amount),
          },
        });
      }
    }
    if (move.pendingId) {
      const pending = await tx.pendingPayment.findUnique({
        where: { id: move.pendingId },
      });
      if (pending?.expenseId) {
        await tx.expense.delete({ where: { id: pending.expenseId } });
      }
      if (pending) {
        await tx.pendingPayment.update({
          where: { id: pending.id },
          data: { status: "PENDING", expenseId: null },
        });
        await tx.recurringRule.update({
          where: { id: pending.ruleId },
          data: { isActive: true },
        });
      }
    }
    await tx.ledgerMove.delete({ where: { id: move.id } });
  });

  return NextResponse.json({ ok: true });
}
