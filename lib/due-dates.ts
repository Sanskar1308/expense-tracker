/** App is India-first (₹ / en-IN); due calendar days use this zone. */
export const DUES_TZ = "Asia/Kolkata";

export function clampDayOfMonth(day: number): number {
  return Math.min(28, Math.max(1, Math.floor(day)));
}

/** Stable storage instant for a calendar Y-M-D (noon UTC — unique across hosts). */
export function utcNoon(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
}

export function ymdInZone(
  d: Date,
  timeZone = DUES_TZ
): { year: number; monthIndex: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return {
    year: get("year"),
    monthIndex: get("month") - 1,
    day: get("day"),
  };
}

export function calendarKey(d: Date, timeZone = DUES_TZ): string {
  const { year, monthIndex, day } = ymdInZone(d, timeZone);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Date at noon UTC for year/month with day clamped (max 28 for rules). */
export function dateForDayInMonth(
  year: number,
  monthIndex: number,
  day: number
): Date {
  const dim = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const d = Math.min(clampDayOfMonth(day), dim);
  return utcNoon(year, monthIndex, d);
}

/** Most recent occurrence of `day` on or before `from` (DUES_TZ calendar). */
export function lastOnOrBefore(from: Date, day: number): Date {
  const { year, monthIndex, day: fromDay } = ymdInZone(from);
  const candidate = dateForDayInMonth(year, monthIndex, day);
  const cand = ymdInZone(candidate);
  if (
    cand.year < year ||
    (cand.year === year && cand.monthIndex < monthIndex) ||
    (cand.year === year &&
      cand.monthIndex === monthIndex &&
      cand.day <= fromDay)
  ) {
    return candidate;
  }
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  return dateForDayInMonth(prevYear, prevMonth, day);
}

/** Next occurrence of `day` on or after `from` (DUES_TZ calendar). */
export function nextOnOrAfter(from: Date, day: number): Date {
  const { year, monthIndex, day: fromDay } = ymdInZone(from);
  const candidate = dateForDayInMonth(year, monthIndex, day);
  const cand = ymdInZone(candidate);
  if (
    cand.year > year ||
    (cand.year === year && cand.monthIndex > monthIndex) ||
    (cand.year === year &&
      cand.monthIndex === monthIndex &&
      cand.day >= fromDay)
  ) {
    return candidate;
  }
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  return dateForDayInMonth(nextYear, nextMonth, day);
}

export function addMonths(d: Date, n: number): Date {
  const { year, monthIndex, day } = ymdInZone(d);
  return utcNoon(year, monthIndex + n, day);
}

/** Due dates to generate for a monthly rule (lookback ≤ 3 months through current). */
export function dueDatesForRule(
  dayOfMonth: number,
  startDate: Date,
  now = new Date(),
  lookbackMonths = 3
): Date[] {
  const todayParts = ymdInZone(now);
  const today = utcNoon(todayParts.year, todayParts.monthIndex, todayParts.day);
  const startParts = ymdInZone(startDate);
  const start = utcNoon(startParts.year, startParts.monthIndex, startParts.day);
  const earliest = addMonths(today, -lookbackMonths);
  const from = start.getTime() > earliest.getTime() ? start : earliest;

  const dates: Date[] = [];
  const seen = new Set<string>();

  let cursorYear = ymdInZone(from).year;
  let cursorMonth = ymdInZone(from).monthIndex;
  const endYear = todayParts.year;
  const endMonth = todayParts.monthIndex;

  while (
    cursorYear < endYear ||
    (cursorYear === endYear && cursorMonth <= endMonth)
  ) {
    const due = dateForDayInMonth(cursorYear, cursorMonth, dayOfMonth);
    const key = calendarKey(due);
    if (
      due.getTime() >= from.getTime() &&
      due.getTime() <= today.getTime() &&
      !seen.has(key)
    ) {
      dates.push(due);
      seen.add(key);
    }
    cursorMonth += 1;
    if (cursorMonth > 11) {
      cursorMonth = 0;
      cursorYear += 1;
    }
  }

  const upcoming = nextOnOrAfter(now, dayOfMonth);
  const upcomingKey = calendarKey(upcoming);
  if (!seen.has(upcomingKey)) {
    const limit = addMonths(today, 1);
    if (upcoming.getTime() <= limit.getTime()) {
      dates.push(upcoming);
      seen.add(upcomingKey);
    }
  }

  return dates;
}

export function daysUntil(date: Date, now = new Date()): number {
  const a = calendarKey(now);
  const b = calendarKey(date);
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((bMs - aMs) / (24 * 60 * 60 * 1000));
}

/** Format a stored due date for UI (Asia/Kolkata calendar day). */
export function formatDueDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", {
    timeZone: DUES_TZ,
    day: "numeric",
    month: "short",
  });
}
