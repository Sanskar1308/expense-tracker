import { NextResponse } from "next/server";
import { PaymentMethod, TransactionType } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";
import { validateTransactionPayload } from "../../../../lib/money";
import { findOwnAccount } from "../../../../lib/accounts";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.expense.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const amount = parseFloat(body.amount);
  const type = body.type as TransactionType;
  const error = validateTransactionPayload({
    title: body.title,
    amount,
    category: body.category,
    type,
    paymentMethod: body.paymentMethod,
    cardId: body.cardId,
  });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const isCredit = type === "CREDIT";
  const paymentMethod = isCredit
    ? null
    : (body.paymentMethod as PaymentMethod);
  const cardId = isCredit
    ? null
    : paymentMethod === "CC"
      ? (body.cardId as string)
      : null;

  if (cardId) {
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.id },
    });
    if (!card) {
      return NextResponse.json({ error: "Invalid card" }, { status: 400 });
    }
  }

  let accountId: string | null = null;
  if (!cardId && body.accountId) {
    const account = await findOwnAccount(user.id, body.accountId);
    if (!account) {
      return NextResponse.json({ error: "Invalid account" }, { status: 400 });
    }
    accountId = account.id;
  } else if (!cardId) {
    const accountCount = await prisma.moneyAccount.count({
      where: { userId: user.id, isActive: true },
    });
    if (accountCount > 0) {
      return NextResponse.json({ error: "Account required" }, { status: 400 });
    }
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      title: String(body.title).trim(),
      amount,
      category: String(body.category).trim(),
      type,
      paymentMethod,
      cardId,
      accountId,
    },
    include: { card: true, account: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.expense.findFirst({
    where: { id, userId: user.id },
    include: { pendingPayment: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (existing.pendingPayment) {
      await tx.pendingPayment.update({
        where: { id: existing.pendingPayment.id },
        data: { status: "PENDING", expenseId: null },
      });
      await tx.recurringRule.update({
        where: { id: existing.pendingPayment.ruleId },
        data: { isActive: true },
      });
    }
    await tx.expense.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
