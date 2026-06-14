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
import { useStudentResultsData } from "@/contexts/student-results-context";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  ChartTooltip,
} from "@/components/ui/chart-tooltip";

const series = [
  { key: "overall", label: "Overall", color: "#1b2a4a", width: 2.5 },
  { key: "listening", label: "L", color: "#0ea5e9", width: 1.5 },
  { key: "reading", label: "R", color: "#10b981", width: 1.5 },
  { key: "writing", label: "W", color: "#8b5cf6", width: 1.5 },
  { key: "speaking", label: "S", color: "#f43f5e", width: 1.5 },
] as const;

export function ScoreProgressionChart() {
  const { data: results } = useStudentResultsData();
  if (!results?.released || !results.scoreProgression.length) return null;
  const data = results.scoreProgression;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gray-400" />
          <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
            Score Progression
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <TrendingUp className="h-3 w-3" />+{results.overallImprovement} overall
        </span>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={data} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ ...CHART_AXIS_TICK, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[4.5, 9]}
              ticks={[4.5, 6.5, 9]}
              tick={{ ...CHART_AXIS_TICK, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              content={
                <ChartTooltip formatValue={(v) => v.toFixed(1)} />
              }
              cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={s.width}
                dot={s.key === "overall" ? { r: 3.5, fill: s.color, strokeWidth: 0 } : false}
                activeDot={{ r: 5, fill: s.color, stroke: "#fff", strokeWidth: 2 }}
                opacity={s.key === "overall" ? 1 : 0.75}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="h-2 w-3 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[11px] font-medium text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
