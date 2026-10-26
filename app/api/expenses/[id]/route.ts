import { NextResponse } from "next/server";
import { PaymentMethod, TransactionType } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";
import { validateTransactionPayload } from "../../../../lib/money";

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

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      title: String(body.title).trim(),
      amount,
      category: String(body.category).trim(),
      type,
      paymentMethod,
      cardId,
    },
    include: { card: true },
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
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
