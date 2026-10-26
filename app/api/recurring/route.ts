import { NextResponse } from "next/server";
import { PaymentMethod, TransactionType } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { clampDayOfMonth } from "../../../lib/dues";
import { validateTransactionPayload } from "../../../lib/money";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.recurringRule.findMany({
    where: { userId: user.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { pendings: { where: { status: "PAID" } } } },
    },
  });

  return NextResponse.json(
    rules.map((r) => ({
      ...r,
      paidCount: r._count.pendings,
      _count: undefined,
    }))
  );
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const amount = parseFloat(body.amount);
  const type = (body.type as TransactionType) || "DEBIT";
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

  const dayOfMonth = clampDayOfMonth(Number(body.dayOfMonth) || 1);
  const totalMonths =
    body.totalMonths != null && body.totalMonths !== ""
      ? Math.max(1, Math.floor(Number(body.totalMonths)))
      : null;

  const isCredit = type === "CREDIT";
  const paymentMethod = isCredit
    ? null
    : (body.paymentMethod as PaymentMethod);
  const cardId =
    !isCredit && paymentMethod === "CC" ? String(body.cardId) : null;

  if (cardId) {
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.id },
    });
    if (!card) {
      return NextResponse.json({ error: "Invalid card" }, { status: 400 });
    }
  }

  const rule = await prisma.recurringRule.create({
    data: {
      userId: user.id,
      title: String(body.title).trim(),
      amount,
      category: String(body.category).trim(),
      type,
      paymentMethod,
      cardId,
      payee: body.payee ? String(body.payee).trim() : null,
      dayOfMonth,
      totalMonths,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      isActive: true,
    },
  });

  return NextResponse.json(rule);
}
