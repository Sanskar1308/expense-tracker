"use client";

import { formatRupee, cn } from "../../lib/utils";

type Heatmap = {
  weekdays: string[];
  weeks: {
    weekLabel: string;
    days: { date: string; weekday: string; amount: number }[];
  }[];
  max: number;
};

function cellColor(amount: number, max: number) {
  if (max <= 0 || amount <= 0) return "bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500";
  const t = amount / max;
  if (t < 0.25) return "bg-emerald-100 text-emerald-900";
  if (t < 0.5) return "bg-emerald-300 text-emerald-950";
  if (t < 0.75) return "bg-emerald-50 dark:bg-emerald-950/500 text-white";
  return "bg-emerald-700 text-white";
}

export default function WeekdayHeatmap({ data }: { data: Heatmap }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1 text-center text-[10px] text-stone-500 dark:text-stone-400 ">
        <div />
        {data.weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      {data.weeks.map((week) => (
        <div
          key={week.weekLabel + week.days[0]?.date}
          className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1"
        >
          <div className="flex items-center text-[10px] text-stone-500 dark:text-stone-400 ">
            {week.weekLabel}
          </div>
          {week.days.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${formatRupee(day.amount)}`}
              className={cn(
                "aspect-square rounded-md text-[9px] font-medium leading-none flex items-center justify-center",
                cellColor(day.amount, data.max)
              )}
            >
              {day.amount > 0 ? Math.round(day.amount) : ""}
            </div>
          ))}
        </div>
      ))}
      <p className="text-[11px] text-stone-500 dark:text-stone-400 ">
        Darker = more spent that day · last 4 weeks
      </p>
    </div>
  );
}
