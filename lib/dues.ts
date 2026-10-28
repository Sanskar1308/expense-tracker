import { prisma } from "./prisma";
import { endOfDay, startOfDay } from "./money";
import { categoryLabel } from "./analytics";
import {
  addMonths,
  calendarKey,
  dateForDayInMonth,
  dueDatesForRule,
  lastOnOrBefore,
  nextOnOrAfter,
  utcNoon,
  ymdInZone,
} from "./due-dates";

export {
  clampDayOfMonth,
  calendarKey,
  dateForDayInMonth,
  dueDatesForRule,
  daysUntil,
  formatDueDate,
  lastOnOrBefore,
  nextOnOrAfter,
  utcNoon,
  ymdInZone,
  DUES_TZ,
} from "./due-dates";

/**
 * Collapse same-rule pendings that share a calendar day (IST vs UTC host
 * mismatch), then rewrite dueDate to UTC noon so upserts stay idempotent.
 */
async function normalizePendingsForRule(ruleId: string) {
  const rows = await prisma.pendingPayment.findMany({
    where: { ruleId },
    orderBy: { createdAt: "asc" },
  });
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = calendarKey(row.dueDate);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  for (const [, list] of groups) {
    const keeper =
      list.find((p) => p.status === "PAID" && p.expenseId) ||
      list.find((p) => p.status === "PAID") ||
      list[0];
    const dropIds = list.filter((p) => p.id !== keeper.id).map((p) => p.id);
    if (dropIds.length > 0) {
      await prisma.pendingPayment.deleteMany({
        where: { id: { in: dropIds } },
      });
    }

    const { year, monthIndex, day } = ymdInZone(keeper.dueDate);
    const normalized = utcNoon(year, monthIndex, day);
    if (keeper.dueDate.getTime() !== normalized.getTime()) {
      await prisma.pendingPayment.update({
        where: { id: keeper.id },
        data: { dueDate: normalized },
      });
    }
  }
}

export async function ensurePendingsForUser(userId: string) {
  const allRules = await prisma.recurringRule.findMany({
    where: { userId },
  });

  for (const rule of allRules) {
    await normalizePendingsForRule(rule.id);
  }

  const rules = allRules.filter((r) => r.isActive);

  for (const rule of rules) {
    const paidCount = await prisma.pendingPayment.count({
      where: { ruleId: rule.id, status: "PAID" },
    });
    if (rule.totalMonths != null && paidCount >= rule.totalMonths) {
      await prisma.recurringRule.update({
        where: { id: rule.id },
        data: { isActive: false },
      });
      continue;
    }

    const dates = dueDatesForRule(rule.dayOfMonth, rule.startDate);
    for (const dueDate of dates) {
      if (rule.totalMonths != null) {
        const stillPaid = await prisma.pendingPayment.count({
          where: { ruleId: rule.id, status: "PAID" },
        });
        const existingForDate = await prisma.pendingPayment.findUnique({
          where: {
            ruleId_dueDate: { ruleId: rule.id, dueDate },
          },
        });
        if (!existingForDate && stillPaid >= rule.totalMonths) break;
      }

      await prisma.pendingPayment.upsert({
        where: {
          ruleId_dueDate: { ruleId: rule.id, dueDate },
        },
        create: {
          userId,
          ruleId: rule.id,
          title: rule.title,
          amount: rule.amount,
          category: rule.category,
          type: rule.type,
          paymentMethod: rule.paymentMethod,
          cardId: rule.cardId,
          accountId: rule.accountId,
          investmentId: rule.investmentId,
          payee: rule.payee,
          dueDate,
          status: "PENDING",
        },
        update: {},
      });
    }
  }
}

export function cardBillingCycle(
  statementDay: number,
  dueDay: number,
  now = new Date()
) {
  const cycleStart = lastOnOrBefore(now, statementDay);
  const dueDate = nextOnOrAfter(cycleStart, dueDay);
  let due = dueDate;
  if (due < cycleStart) {
    due = nextOnOrAfter(addMonths(cycleStart, 0), dueDay);
    if (due < cycleStart) due = addMonths(due, 1);
  }
  if (due < cycleStart) {
    const { year, monthIndex } = ymdInZone(cycleStart);
    due = dateForDayInMonth(year, monthIndex, dueDay);
    if (due < cycleStart) {
      due = dateForDayInMonth(year, monthIndex + 1, dueDay);
    }
  }
  return { cycleStart, dueDate: due, cycleEnd: endOfDay(now) };
}

export function buildPeriodCompare(
  rows: { amount: number; category: string; type: string; createdAt: Date }[],
  mode: "week" | "month",
  now = new Date()
) {
  const today = startOfDay(now);
  let thisStart: Date;
  const thisEnd = endOfDay(today);
  let prevStart: Date;
  let prevEnd: Date;

  if (mode === "week") {
    const dow = (today.getDay() + 6) % 7; // Mon=0
    thisStart = new Date(today);
    thisStart.setDate(today.getDate() - dow);
    prevEnd = endOfDay(new Date(thisStart.getTime() - 1));
    prevStart = new Date(thisStart);
    prevStart.setDate(thisStart.getDate() - 7);
  } else {
    thisStart = new Date(today.getFullYear(), today.getMonth(), 1);
    prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    prevEnd = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
  }

  function aggregate(from: Date, to: Date) {
    let total = 0;
    const byCat: Record<string, number> = {};
    for (const r of rows) {
      if (r.type !== "DEBIT") continue;
      const t = new Date(r.createdAt);
      if (t < from || t > to) continue;
      total += r.amount;
      byCat[r.category] = (byCat[r.category] ?? 0) + r.amount;
    }
    return { total, byCat };
  }

  const curr = aggregate(thisStart, thisEnd);
  const prev = aggregate(prevStart, prevEnd);
  const deltaPct =
    prev.total === 0
      ? curr.total > 0
        ? 100
        : 0
      : ((curr.total - prev.total) / prev.total) * 100;

  const cats = new Set([
    ...Object.keys(curr.byCat),
    ...Object.keys(prev.byCat),
  ]);
  const movers = [...cats]
    .map((category) => {
      const a = curr.byCat[category] ?? 0;
      const b = prev.byCat[category] ?? 0;
      const change = a - b;
      const pct = b === 0 ? (a > 0 ? 100 : 0) : (change / b) * 100;
      return {
        category,
        name: categoryLabel(category),
        current: Math.round(a * 100) / 100,
        previous: Math.round(b * 100) / 100,
        change: Math.round(change * 100) / 100,
        pct: Math.round(pct * 10) / 10,
      };
    })
    .sort((x, y) => Math.abs(y.change) - Math.abs(x.change))
    .slice(0, 5);

  return {
    mode,
    currentTotal: Math.round(curr.total * 100) / 100,
    previousTotal: Math.round(prev.total * 100) / 100,
    deltaPct: Math.round(deltaPct * 10) / 10,
    movers,
  };
}
