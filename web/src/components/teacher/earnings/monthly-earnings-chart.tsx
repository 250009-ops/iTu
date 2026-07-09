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
} from "@/components/ui/chart-tooltip";
import { formatPrice } from "@/lib/format-price";

export function MonthlyEarningsChart() {
  const { earnings } = useTeacherEarnings();
  const { monthlyEarnings, summary, hasMonthlyEarnings } = earnings;

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Monthly Earnings Trend</h2>
          <p className="mt-0.5 text-sm text-muted">
            Payout history · {summary.currency}
          </p>
        </div>
        {summary.monthlyTrend !== "—" && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" />
            {summary.monthlyTrend}
          </span>
        )}
      </div>

      <div className="mt-4">
        {hasMonthlyEarnings ? (
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
                tickFormatter={(v) => formatPrice(Number(v), summary.currency)}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatValue={(v) => formatPrice(v, summary.currency)}
                  />
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
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-slate-50/60 px-6 text-center text-sm text-muted">
            Payout history will appear here after your first completed sessions.
          </div>
        )}
      </div>
    </div>
  );
}
