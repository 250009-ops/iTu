"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminReports } from "@/contexts/admin-reports-context";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  ChartTooltip,
  formatChartAxisNumber,
  formatCurrency,
} from "@/components/ui/chart-tooltip";

export function RevenueExamVolumeChart() {
  const { revenueExamVolume, periodLabel } = useAdminReports();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Revenue &amp; Exam Volume</h2>
          <p className="mt-0.5 text-sm text-muted">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-navy" />
            Revenue
            <span className="font-medium text-slate-500">(so&apos;m)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-sky-400" />
            Exams
          </span>
        </div>
      </div>

      <div className="mt-4">
        {revenueExamVolume.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No revenue data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={revenueExamVolume} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1b2a4a" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#1b2a4a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="month"
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="revenue"
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => formatChartAxisNumber(v)}
              />
              <YAxis
                yAxisId="exams"
                orientation="right"
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatValue={(v, key) =>
                      key === "revenue" ? formatCurrency(v) : v.toLocaleString()
                    }
                  />
                }
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#1b2a4a"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                activeDot={{ r: 6, fill: "#1b2a4a", stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                yAxisId="exams"
                type="monotone"
                dataKey="exams"
                name="Exams"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 5, fill: "#38bdf8", stroke: "#fff", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
