"use client";

import {
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
} from "recharts";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  ChartTooltip,
} from "@/components/ui/chart-tooltip";

export function BandProgressChart() {
  const { data } = useStudentDashboardData();
  const bandProgress = (data?.bandProgress ?? []).filter(
    (d): d is { month: string; band: number } => d.band != null,
  );

  const firstBand = bandProgress[0]?.band;
  const lastBand = bandProgress[bandProgress.length - 1]?.band;
  const delta =
    firstBand != null && lastBand != null
      ? Math.round((lastBand - firstBand) * 2) / 2
      : null;

  if (bandProgress.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-border bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-navy">Band Progress</h3>
        <p className="mt-8 flex flex-1 items-center justify-center text-sm text-muted">
          Complete mocks to see your progression
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-navy">Band Progress</h3>
        {delta != null && delta !== 0 && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              delta > 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta} overall
          </span>
        )}
      </div>

      <div className="mt-4 flex-1">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={bandProgress} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="month"
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 9]}
              ticks={[0, 3, 6, 9]}
              tick={CHART_AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              content={
                <ChartTooltip formatValue={(v) => v.toFixed(1)} />
              }
              cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="band"
              name="Overall band"
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
