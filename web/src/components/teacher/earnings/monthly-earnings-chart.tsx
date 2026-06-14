"use client";

import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
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

export function MonthlyEarningsChart() {
  const { earnings } = useTeacherEarnings();
  const { monthlyEarnings, summary } = earnings;

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Monthly Earnings Trend</h2>
          <p className="mt-0.5 text-sm text-muted">Payout history · USD</p>
        </div>
        {summary.monthlyTrend !== "—" && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" />
            {summary.monthlyTrend}
          </span>
        )}
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyEarnings} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="month"
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              content={
                <ChartTooltip formatValue={(v) => formatCurrency(v)} />
              }
              cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              name="Earnings"
              stroke="#1b2a4a"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#1b2a4a", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#1b2a4a", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
