import { NextResponse } from "next/server";
import {
  CategoryType,
  PaymentMethod,
  Prisma,
  TransactionType,
} from "@prisma/client";
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
  if (category) where.category = category as CategoryType;
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

  return NextResponse.json(expenses);
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

  const newExpense = await prisma.expense.create({
    data: {
      title: String(body.title).trim(),
      amount,
      category: body.category as CategoryType,
      type,
      paymentMethod,
      cardId,
      userId: user.id,
    },
    include: { card: true },
  });

  return NextResponse.json(newExpense);
}
