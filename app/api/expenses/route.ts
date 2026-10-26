import { NextResponse } from "next/server";
import { PaymentMethod, Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { validateTransactionPayload } from "../../../lib/money";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type");
  const paymentMethod = searchParams.get("paymentMethod");
  const cardId = searchParams.get("cardId");
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.ExpenseWhereInput = { userId: user.id };

  if (q) {
    where.title = { contains: q, mode: "insensitive" };
  }
  if (type === "CREDIT" || type === "DEBIT") {
    where.type = type;
  }
  if (
    paymentMethod === "CASH" ||
    paymentMethod === "UPI" ||
    paymentMethod === "CC"
  ) {
    where.paymentMethod = paymentMethod;
  }
  if (cardId) where.cardId = cardId;
  if (category) where.category = category;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { card: true },
    orderBy: { createdAt: "desc" },
  });

  const ids = expenses.map((e) => e.id);
  const linked =
    ids.length === 0
      ? []
      : await prisma.pendingPayment.findMany({
          where: { expenseId: { in: ids } },
          select: { id: true, expenseId: true },
        });
  const pendingByExpense = new Map(
    linked.map((p) => [p.expenseId!, p.id])
  );

  return NextResponse.json(
    expenses.map((e) => ({
      ...e,
      fromPending: pendingByExpense.has(e.id),
      pendingId: pendingByExpense.get(e.id) ?? null,
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
      where: { id: cardId, userId: user.id, isActive: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Invalid card" }, { status: 400 });
    }
  }

  let createdAt: Date | undefined;
  if (body.createdAt != null && body.createdAt !== "") {
    const parsed = new Date(body.createdAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid createdAt" }, { status: 400 });
    }
    createdAt = parsed;
  }

  const pendingId =
    typeof body.pendingId === "string" && body.pendingId
      ? body.pendingId
      : null;

  if (pendingId) {
    const pending = await prisma.pendingPayment.findFirst({
      where: { id: pendingId, userId: user.id, status: "PENDING" },
    });
    if (!pending) {
      return NextResponse.json(
        { error: "Pending due not found or already paid" },
        { status: 400 }
      );
    }
  }

  const newExpense = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        title: String(body.title).trim(),
        amount,
        category: String(body.category).trim(),
        type,
        paymentMethod,
        cardId,
        userId: user.id,
        ...(createdAt ? { createdAt } : {}),
      },
      include: { card: true },
    });

    if (pendingId) {
      await tx.pendingPayment.update({
        where: { id: pendingId },
        data: { status: "PAID", expenseId: expense.id },
      });
    }

    return expense;
  });

  return NextResponse.json({
    ...newExpense,
    fromPending: !!pendingId,
    pendingId,
  });
}
