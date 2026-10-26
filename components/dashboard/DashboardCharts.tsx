"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import WeekdayHeatmap from "./WeekdayHeatmap";
import type { SummaryCharts } from "../../lib/types";
import { formatRupee } from "../../lib/utils";

const PIE_COLORS = [
  "#047857",
  "#0f766e",
  "#ca8a04",
  "#b45309",
  "#7c3aed",
  "#0369a1",
  "#be123c",
  "#57534e",
];

const METHOD_COLORS: Record<string, string> = {
  CASH: "#d97706",
  UPI: "#0284c7",
  CC: "#7c3aed",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs shadow-sm dark:border-stone-600 dark:bg-stone-900">
      {label && <p className="text-stone-500 dark:text-stone-400">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-medium text-stone-900 dark:text-stone-100">
          {formatRupee(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export default function DashboardCharts({ charts }: { charts: SummaryCharts }) {
  const hasDaily = charts.dailySpend.some((d) => d.amount > 0);
  const hasCategory = charts.byCategory.length > 0;
  const hasMethod = charts.byMethod.some((m) => m.amount > 0);
  const hasHeat = charts.weekdayHeatmap.max > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Daily spend · 30 days</CardTitle>
        </CardHeader>
        <CardContent className="h-48 md:h-64">
          {hasDaily ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.dailySpend}>
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#047857" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  width={36}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#047857"
                  fill="url(#spendFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By category · month</CardTitle>
          </CardHeader>
          <CardContent className="h-52 md:h-60">
            {hasCategory ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.byCategory}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {charts.byCategory.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
            {hasCategory && (
              <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-stone-600 dark:text-stone-400 ">
                {charts.byCategory.slice(0, 6).map((c, i) => (
                  <li key={c.category} className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash · UPI · Card · month</CardTitle>
          </CardHeader>
          <CardContent className="h-52 md:h-60">
            {hasMethod ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.byMethod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis
                    dataKey="method"
                    tick={{ fontSize: 11, fill: "#78716c" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#78716c" }}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {charts.byMethod.map((m) => (
                      <Cell
                        key={m.key}
                        fill={METHOD_COLORS[m.key] ?? "#047857"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekday heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {hasHeat ? (
            <WeekdayHeatmap data={charts.weekdayHeatmap} />
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full min-h-24 items-center justify-center text-sm text-stone-500 dark:text-stone-400 ">
      Not enough spend data yet
    </div>
  );
}
