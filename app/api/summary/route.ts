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
import {
  buildCategorySpend,
  buildDailySpend,
  buildMethodSpend,
  buildWeekdayHeatmap,
  type DebitRow,
} from "../../../lib/analytics";
import {
  buildPeriodCompare,
  cardBillingCycle,
  daysUntil,
  ensurePendingsForUser,
} from "../../../lib/dues";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensurePendingsForUser(user.id);

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || getMonthKey();
  const compareMode =
    searchParams.get("compare") === "week" ? "week" : "month";
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const soon = startOfDay();
  soon.setDate(soon.getDate() + 3);

  const heatmapStart = startOfDay();
  heatmapStart.setDate(heatmapStart.getDate() - 28);

  const [
    allRows,
    monthRows,
    todayDebits,
    cards,
    budgets,
    recent,
    last30Debits,
    heatmapDebits,
    soonPendings,
    savingsGoal,
  ] = await Promise.all([
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
      include: {
        card: true,
        pendingPayment: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.expense.findMany({
      where: {
        userId: user.id,
        type: "DEBIT",
        createdAt: {
          gte: (() => {
            const d = startOfDay();
            d.setDate(d.getDate() - 29);
            return d;
          })(),
          lte: todayEnd,
        },
      },
      select: {
        amount: true,
        paymentMethod: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.expense.findMany({
      where: {
        userId: user.id,
        type: "DEBIT",
        createdAt: { gte: heatmapStart, lte: todayEnd },
      },
      select: {
        amount: true,
        paymentMethod: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.pendingPayment.findMany({
      where: {
        userId: user.id,
        status: "PENDING",
        dueDate: { lte: endOfDay(soon) },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.savingsGoal.findUnique({ where: { userId: user.id } }),
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

  const monthDebits: DebitRow[] = monthRows
    .filter((r) => r.type === "DEBIT")
    .map((r) => ({
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      category: r.category,
      createdAt: r.createdAt,
    }));

  const dailyRows: DebitRow[] = last30Debits.map((r) => ({
    amount: r.amount,
    paymentMethod: r.paymentMethod,
    category: r.category,
    createdAt: r.createdAt,
  }));

  const heatmapRows: DebitRow[] = heatmapDebits.map((r) => ({
    amount: r.amount,
    paymentMethod: r.paymentMethod,
    category: r.category,
    createdAt: r.createdAt,
  }));

  const cardBills = cards
    .filter((c) => c.statementDay != null && c.dueDay != null)
    .map((c) => {
      const cycle = cardBillingCycle(c.statementDay!, c.dueDay!);
      const owed = allRows
        .filter(
          (r) =>
            r.type === "DEBIT" &&
            r.paymentMethod === "CC" &&
            r.cardId === c.id &&
            r.createdAt >= cycle.cycleStart &&
            r.createdAt <= cycle.cycleEnd
        )
        .reduce((s, r) => s + r.amount, 0);
      const daysLeft = daysUntil(cycle.dueDate);
      return {
        id: c.id,
        name: c.name,
        last4: c.last4,
        owed: Math.round(owed * 100) / 100,
        dueDate: cycle.dueDate.toISOString(),
        cycleStart: cycle.cycleStart.toISOString(),
        daysLeft,
        dueSoon: daysLeft >= 0 && daysLeft <= 3,
      };
    });

  const duesBadge =
    soonPendings.length + cardBills.filter((b) => b.dueSoon).length;

  const compare = buildPeriodCompare(allRows, compareMode);

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
      statementDay: c.statementDay,
      dueDay: c.dueDay,
      spentThisMonth: spentByCard[c.id] ?? 0,
    })),
    budgets: budgets
      .filter((b) => b.amount > 0)
      .map((b) => ({
        category: b.category,
        limit: b.amount,
        spent: spentByCategory[b.category] ?? 0,
      })),
    recent: recent.map(({ pendingPayment, ...e }) => ({
      ...e,
      fromPending: !!pendingPayment,
      pendingId: pendingPayment?.id ?? null,
    })),
    charts: {
      dailySpend: buildDailySpend(dailyRows, 30),
      byCategory: buildCategorySpend(monthDebits),
      byMethod: buildMethodSpend(monthDebits),
      weekdayHeatmap: buildWeekdayHeatmap(heatmapRows, 4),
    },
    duesBadge,
    upcomingDues: soonPendings,
    cardBills,
    compare,
    savings: savingsGoal
      ? {
          title: savingsGoal.title,
          targetAmount: savingsGoal.targetAmount,
          deadline: savingsGoal.deadline.toISOString(),
          mainBalance,
          progressPct: Math.min(
            100,
            Math.max(0, (mainBalance / savingsGoal.targetAmount) * 100)
          ),
        }
      : null,
  });
}
