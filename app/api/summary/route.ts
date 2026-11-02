import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import {
  endOfDay,
  endOfMonth,
  getMonthKey,
  startOfDay,
  startOfMonth,
} from "../../../lib/money";
import { ensureMoneyAccounts } from "../../../lib/accounts";
import {
  accountBalance,
  cardBillParts,
  roundMoney,
  unassignedBalance,
} from "../../../lib/balances";
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
  nextOnOrAfter,
  ensurePendingsForUser,
} from "../../../lib/dues";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureMoneyAccounts(user.id);
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
      recentRaw,
      last30Debits,
      heatmapDebits,
      soonPendings,
      savingsGoals,
      moneyAccounts,
      moves,
      investments,
    ] = await Promise.all([
      prisma.expense.findMany({
        where: { userId: user.id },
        select: {
          type: true,
          amount: true,
          paymentMethod: true,
          cardId: true,
          accountId: true,
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
          account: { select: { id: true, name: true } },
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
      prisma.savingsGoal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.moneyAccount.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.ledgerMove.findMany({
        where: { userId: user.id },
        select: {
          fromAccountId: true,
          toAccountId: true,
          cardId: true,
          amount: true,
          createdAt: true,
          note: true,
        },
      }),
      prisma.investment.findMany({
        where: { userId: user.id },
        select: { investedAmount: true, currentValue: true },
      }),
    ]);

    const recentIds = recentRaw.map((e) => e.id);
    const linkedPendings =
      recentIds.length === 0
        ? []
        : await prisma.pendingPayment.findMany({
            where: { expenseId: { in: recentIds } },
            select: { id: true, expenseId: true },
          });
    const pendingByExpense = new Map(
      linkedPendings.map((p) => [p.expenseId!, p.id])
    );
    const recent = recentRaw.map((e) => ({
      ...e,
      fromPending: pendingByExpense.has(e.id),
      pendingId: pendingByExpense.get(e.id) ?? null,
    }));

    const accountRows = moneyAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      isActive: a.isActive,
      balance: accountBalance(a, allRows, moves),
    }));
    const unassigned = unassignedBalance(allRows);
    const liquid = roundMoney(
      accountRows.reduce((sum, a) => sum + a.balance, 0) + unassigned
    );
    const investedTotal = roundMoney(
      investments.reduce((sum, i) => sum + i.investedAmount, 0)
    );
    const investmentsValue = roundMoney(
      investments.reduce((sum, i) => sum + i.currentValue, 0)
    );

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
      .flatMap((c) => {
        const cycle = cardBillingCycle(c.statementDay!, c.dueDay!);
        const parts = cardBillParts(
          c.id,
          cycle.prevStatement,
          cycle.statementDate,
          cycle.nextStatement,
          allRows,
          moves
        );
        const rows: {
          id: string;
          cardId: string;
          cycleKey: string;
          name: string;
          last4: string | null;
          owed: number;
          paid: number;
          dueDate: string;
          cycleStart: string;
          daysLeft: number;
          dueSoon: boolean;
        }[] = [];
        if (parts.closed > 0) {
          const daysLeft = daysUntil(cycle.dueDate);
          rows.push({
            id: `${c.id}-closed`,
            cardId: c.id,
            cycleKey: parts.closedKey,
            name: c.name,
            last4: c.last4,
            owed: parts.closed,
            paid: parts.closedPaid,
            dueDate: cycle.dueDate.toISOString(),
            cycleStart: cycle.prevStatement.toISOString(),
            daysLeft,
            dueSoon: daysLeft >= 0 && daysLeft <= 3,
          });
        }
        const due = nextOnOrAfter(cycle.nextStatement, c.dueDay!);
        const daysLeft = daysUntil(due);
        rows.push({
          id: c.id,
          cardId: c.id,
          cycleKey: parts.openKey,
          name: c.name,
          last4: c.last4,
          owed: parts.open,
          paid: parts.openPaid,
          dueDate: due.toISOString(),
          cycleStart: cycle.statementDate.toISOString(),
          daysLeft,
          dueSoon: parts.open > 0 && daysLeft >= 0 && daysLeft <= 3,
        });
        return rows;
      });

    const duesBadge =
      soonPendings.length + cardBills.filter((b) => b.dueSoon).length;

    const compare = buildPeriodCompare(allRows, compareMode);
    const cardOwed = roundMoney(cardBills.reduce((sum, b) => sum + b.owed, 0));
    const netWorth = roundMoney(liquid + investmentsValue - cardOwed);

    return NextResponse.json({
      spentToday,
      mainBalance: liquid,
      liquid,
      unassigned,
      netWorth,
      investedTotal,
      investmentsValue,
      cardOwed,
      accounts: accountRows,
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
      recent,
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
      savingsGoals: savingsGoals.map((g) => ({
        id: g.id,
        title: g.title,
        targetAmount: g.targetAmount,
        savedAmount: g.savedAmount,
        deadline: g.deadline.toISOString(),
        progressPct: Math.min(
          100,
          Math.max(0, (g.savedAmount / g.targetAmount) * 100)
        ),
      })),
    });
  } catch (err) {
    console.error("[summary]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Summary failed" },
      { status: 500 }
    );
  }
}
