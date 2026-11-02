import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";
import { accountBalance } from "../../../../lib/balances";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.moneyAccount.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: { name?: string; openingBalance?: number; isActive?: boolean } =
    {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.balance != null) {
    const balance = Number(body.balance);
    if (!Number.isFinite(balance)) {
      return NextResponse.json({ error: "Invalid balance" }, { status: 400 });
    }
    const [expenses, moves] = await Promise.all([
      prisma.expense.findMany({
        where: { userId: user.id },
        select: {
          accountId: true,
          type: true,
          amount: true,
          paymentMethod: true,
        },
      }),
      prisma.ledgerMove.findMany({
        where: { userId: user.id },
        select: { fromAccountId: true, toAccountId: true, amount: true },
      }),
    ]);
    const current = accountBalance(existing, expenses, moves);
    data.openingBalance = existing.openingBalance + (balance - current);
  } else if (body.openingBalance != null) {
    const openingBalance = Number(body.openingBalance);
    if (!Number.isFinite(openingBalance)) {
      return NextResponse.json({ error: "Invalid balance" }, { status: 400 });
    }
    data.openingBalance = openingBalance;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  try {
    const account = await prisma.moneyAccount.update({
      where: { id },
      data,
    });
    return NextResponse.json(account);
  } catch {
    return NextResponse.json(
      { error: "An account with that name already exists" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.moneyAccount.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const moves = await prisma.ledgerMove.findMany({
    where: {
      userId: user.id,
      OR: [{ fromAccountId: id }, { toAccountId: id }],
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const move of moves) {
      if (move.investmentId) {
        const inv = await tx.investment.findUnique({
          where: { id: move.investmentId },
        });
        if (inv) {
          await tx.investment.update({
            where: { id: inv.id },
            data: {
              investedAmount: Math.max(0, inv.investedAmount - move.amount),
              currentValue: Math.max(0, inv.currentValue - move.amount),
              ...(move.grams
                ? { grams: Math.max(0, (inv.grams ?? 0) - move.grams) }
                : {}),
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
    }
    await tx.recurringRule.updateMany({
      where: { userId: user.id, accountId: id },
      data: { accountId: null },
    });
    await tx.pendingPayment.updateMany({
      where: { userId: user.id, accountId: id },
      data: { accountId: null },
    });
    await tx.moneyAccount.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
