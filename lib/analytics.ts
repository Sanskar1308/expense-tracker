import { DEFAULT_CATEGORIES } from "./categories";

export type DebitRow = {
  amount: number;
  paymentMethod: "CASH" | "UPI" | "CC" | null;
  category: string;
  createdAt: Date;
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function categoryLabel(value: string): string {
  return DEFAULT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/** Last `days` calendar days of debit totals (inclusive of today). */
export function buildDailySpend(rows: DebitRow[], days = 30) {
  const today = startOfLocalDay(new Date());
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(dayKey(d), 0);
  }
  for (const r of rows) {
    const k = dayKey(startOfLocalDay(new Date(r.createdAt)));
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + r.amount);
  }
  return [...map.entries()].map(([date, amount]) => ({
    date,
    label: date.slice(5), // MM-DD
    amount: Math.round(amount * 100) / 100,
  }));
}

export function buildCategorySpend(rows: DebitRow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      name: categoryLabel(category),
      amount: Math.round(amount * 100) / 100,
    }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function buildMethodSpend(rows: DebitRow[]) {
  const totals = { CASH: 0, UPI: 0, CC: 0 };
  for (const r of rows) {
    if (r.paymentMethod === "CASH" || r.paymentMethod === "UPI" || r.paymentMethod === "CC") {
      totals[r.paymentMethod] += r.amount;
    }
  }
  return [
    { method: "Cash", key: "CASH", amount: Math.round(totals.CASH * 100) / 100 },
    { method: "UPI", key: "UPI", amount: Math.round(totals.UPI * 100) / 100 },
    { method: "Card", key: "CC", amount: Math.round(totals.CC * 100) / 100 },
  ];
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Monday-based weekday index 0..6 */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Last 4 complete-ish weeks ending this week: 4 rows × 7 cols (Mon–Sun).
 * Each cell = debit total that day.
 */
export function buildWeekdayHeatmap(rows: DebitRow[], weeks = 4) {
  const today = startOfLocalDay(new Date());
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - mondayIndex(today));

  const start = new Date(thisMonday);
  start.setDate(thisMonday.getDate() - (weeks - 1) * 7);

  const cellMap = new Map<string, number>();
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cellMap.set(dayKey(d), 0);
  }

  for (const r of rows) {
    const d = startOfLocalDay(new Date(r.createdAt));
    const k = dayKey(d);
    if (cellMap.has(k)) cellMap.set(k, (cellMap.get(k) ?? 0) + r.amount);
  }

  const grid: {
    weekLabel: string;
    days: { date: string; weekday: string; amount: number }[];
  }[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + w * 7);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const date = dayKey(d);
      days.push({
        date,
        weekday: WEEKDAY_LABELS[i],
        amount: Math.round((cellMap.get(date) ?? 0) * 100) / 100,
      });
    }
    grid.push({
      weekLabel: weekStart.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      days,
    });
  }

  const max = Math.max(0, ...[...cellMap.values()]);
  return { weekdays: [...WEEKDAY_LABELS], weeks: grid, max };
}
