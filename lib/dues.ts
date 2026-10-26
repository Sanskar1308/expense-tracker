import { prisma } from "./prisma";
import { endOfDay, startOfDay } from "./money";
import { categoryLabel } from "./analytics";

export function clampDayOfMonth(day: number): number {
  return Math.min(28, Math.max(1, Math.floor(day)));
}

/** Date at local midnight for year/month with day clamped to month length (max 28 for rules). */
export function dateForDayInMonth(year: number, monthIndex: number, day: number): Date {
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const d = Math.min(clampDayOfMonth(day), dim);
  return new Date(year, monthIndex, d, 0, 0, 0, 0);
}

/** Most recent occurrence of `day` on or before `from` (local). */
export function lastOnOrBefore(from: Date, day: number): Date {
  const base = startOfDay(from);
  const candidate = dateForDayInMonth(base.getFullYear(), base.getMonth(), day);
  if (candidate <= base) return candidate;
  const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  return dateForDayInMonth(prev.getFullYear(), prev.getMonth(), day);
}

/** Next occurrence of `day` on or after `from` (local). */
export function nextOnOrAfter(from: Date, day: number): Date {
  const base = startOfDay(from);
  const candidate = dateForDayInMonth(base.getFullYear(), base.getMonth(), day);
  if (candidate >= base) return candidate;
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return dateForDayInMonth(next.getFullYear(), next.getMonth(), day);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate(), 0, 0, 0, 0);
}

/** Due dates to generate for a monthly rule (lookback ≤ 3 months through current). */
export function dueDatesForRule(
  dayOfMonth: number,
  startDate: Date,
  now = new Date(),
  lookbackMonths = 3
): Date[] {
  const today = startOfDay(now);
  const start = startOfDay(startDate);
  const earliest = addMonths(today, -lookbackMonths);
  const from = start > earliest ? start : earliest;

  const dates: Date[] = [];
  // Walk month by month from `from` month to current month
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cursor <= endMonth) {
    const due = dateForDayInMonth(
      cursor.getFullYear(),
      cursor.getMonth(),
      dayOfMonth
    );
    if (due >= from && due <= today) {
      dates.push(due);
    } else if (due > today) {
      // also include upcoming due this month if day hasn't arrived? Spec: generate current cycle
      // Include if due is within next 35 days and same/next cycle
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  // Always include next upcoming due if not already past this month's
  const upcoming = nextOnOrAfter(today, dayOfMonth);
  const upcomingKey = upcoming.getTime();
  if (!dates.some((d) => d.getTime() === upcomingKey)) {
    // only if within ~35 days
    const limit = addMonths(today, 1);
    if (upcoming <= limit) dates.push(upcoming);
  }

  return dates;
}

export async function ensurePendingsForUser(userId: string) {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, isActive: true },
  });

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
  // If due date fell before cycle start somehow, push a month
  let due = dueDate;
  if (due < cycleStart) {
    due = nextOnOrAfter(addMonths(cycleStart, 0), dueDay);
    if (due < cycleStart) due = addMonths(due, 1);
  }
  // Prefer due after statement in same cycle
  if (due < cycleStart) {
    due = dateForDayInMonth(
      cycleStart.getFullYear(),
      cycleStart.getMonth(),
      dueDay
    );
    if (due < cycleStart) {
      due = dateForDayInMonth(
        cycleStart.getFullYear(),
        cycleStart.getMonth() + 1,
        dueDay
      );
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

export function daysUntil(date: Date, now = new Date()): number {
  const a = startOfDay(now).getTime();
  const b = startOfDay(date).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
