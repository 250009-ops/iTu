"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTeacherEarnings } from "@/contexts/teacher-earnings-context";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  ChartTooltip,
  formatCurrency,
} from "@/components/ui/chart-tooltip";

export function WeeklyRevenueChart() {
  const { earnings } = useTeacherEarnings();
  const { weeklyRevenue } = earnings;

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">This Week</h2>
        <p className="mt-0.5 text-sm text-muted">
          Speaking vs. Writing revenue (no breakdown available yet)
        </p>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-navy" />
          Speaking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-300" />
          Writing
        </span>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyRevenue} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="day"
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              content={
                <ChartTooltip formatValue={(v) => formatCurrency(v)} />
              }
              cursor={{ fill: "#f1f5f9", radius: 4 }}
            />
            <Bar
              dataKey="speaking"
              name="Speaking"
              fill="#1b2a4a"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="writing"
              name="Writing"
              fill="#c4b5fd"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
