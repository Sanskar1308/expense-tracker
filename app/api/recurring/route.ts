import { NextResponse } from "next/server";
import { PaymentMethod, TransactionType } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { clampDayOfMonth, ensurePendingsForUser } from "../../../lib/dues";
import { validateTransactionPayload } from "../../../lib/money";
import { findOwnAccount } from "../../../lib/accounts";

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
  const kind =
    body.kind === "income" || body.kind === "invest" ? body.kind : "spend";
  const type: TransactionType = kind === "income" ? "CREDIT" : "DEBIT";
  const dayOfMonth = clampDayOfMonth(Number(body.dayOfMonth) || 1);
  const totalMonths =
    body.totalMonths != null && body.totalMonths !== ""
      ? Math.max(1, Math.floor(Number(body.totalMonths)))
      : null;

  let paymentMethod: PaymentMethod | null = null;
  let cardId: string | null = null;
  let accountId: string | null = null;
  let investmentId: string | null = null;
  let category = String(body.category ?? "OTHER").trim() || "OTHER";
  const title = String(body.title ?? "").trim();

  if (kind === "invest") {
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }
    if (!(amount > 0)) {
      return NextResponse.json({ error: "Positive amount required" }, { status: 400 });
    }
    const investment = await prisma.investment.findFirst({
      where: { id: String(body.investmentId ?? ""), userId: user.id },
    });
    if (!investment) {
      return NextResponse.json({ error: "Investment required" }, { status: 400 });
    }
    if (body.accountId) {
      const account = await findOwnAccount(user.id, body.accountId);
      if (!account) {
        return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      }
      accountId = account.id;
    }
    investmentId = investment.id;
    category = "INVEST";
  } else {
    const error = validateTransactionPayload({
      title,
      amount,
      category,
      type,
      paymentMethod: kind === "income" ? null : body.paymentMethod,
      cardId: body.cardId,
    });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    if (kind === "spend") {
      paymentMethod = body.paymentMethod as PaymentMethod;
      cardId = paymentMethod === "CC" ? String(body.cardId) : null;
      if (cardId) {
        const card = await prisma.creditCard.findFirst({
          where: { id: cardId, userId: user.id },
        });
        if (!card) {
          return NextResponse.json({ error: "Invalid card" }, { status: 400 });
        }
      }
    }
    if (!cardId) {
      const account = await findOwnAccount(user.id, body.accountId);
      const accountCount = await prisma.moneyAccount.count({
        where: { userId: user.id, isActive: true },
      });
      if (!account && accountCount > 0) {
        return NextResponse.json({ error: "Account required" }, { status: 400 });
      }
      if (body.accountId && !account) {
        return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      }
      accountId = account?.id ?? null;
    }
  }

  const rule = await prisma.recurringRule.create({
    data: {
      userId: user.id,
      title,
      amount,
      category,
      type,
      paymentMethod,
      cardId,
      accountId,
      investmentId,
      payee: body.payee ? String(body.payee).trim() : null,
      dayOfMonth,
      totalMonths,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      isActive: true,
    },
  });

  await ensurePendingsForUser(user.id);
  return NextResponse.json(rule);
}
