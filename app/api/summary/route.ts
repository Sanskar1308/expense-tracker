import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import {
  computeMainBalance,
  endOfDay,
  endOfMonth,
  getMonthKey,
  startOfDay,
  startOfMonth,
} from "../../../lib/money";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || getMonthKey();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [allRows, monthRows, todayDebits, cards, budgets, recent] =
    await Promise.all([
      prisma.expense.findMany({
        where: { userId: user.id },
        select: {
          type: true,
          amount: true,
          paymentMethod: true,
          cardId: true,
          createdAt: true,
          category: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.expense.findMany({
        where: {
          userId: user.id,
          type: "DEBIT",
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.creditCard.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.budget.findMany({
        where: { userId: user.id, month },
      }),
      prisma.expense.findMany({
        where: { userId: user.id },
        include: { card: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const mainBalance = computeMainBalance(allRows);

  let credited = 0;
  let spentCashUpi = 0;
  let spentCc = 0;
  const spentByCategory: Record<string, number> = {};
  const spentByCard: Record<string, number> = {};

  for (const r of monthRows) {
    if (r.type === "CREDIT") {
      credited += r.amount;
      continue;
    }
    if (r.paymentMethod === "CASH" || r.paymentMethod === "UPI") {
      spentCashUpi += r.amount;
    } else if (r.paymentMethod === "CC") {
      spentCc += r.amount;
      if (r.cardId) {
        spentByCard[r.cardId] = (spentByCard[r.cardId] ?? 0) + r.amount;
      }
    }
    spentByCategory[r.category] =
      (spentByCategory[r.category] ?? 0) + r.amount;
  }

  const spentToday = todayDebits.reduce((sum, r) => sum + r.amount, 0);

  return NextResponse.json({
    spentToday,
    mainBalance,
    month: {
      key: month,
      credited,
      spentCashUpi,
      spentCc,
    },
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      last4: c.last4,
      spentThisMonth: spentByCard[c.id] ?? 0,
    })),
    budgets: budgets
      .filter((b) => b.amount > 0)
      .map((b) => ({
        category: b.category,
        limit: b.amount,
        spent: spentByCategory[b.category] ?? 0,
      })),
    recent,
  });
}
