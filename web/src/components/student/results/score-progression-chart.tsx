"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
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
import type { SkillId } from "@/lib/api/mappers/student";
import { formatBandDisplay } from "@/lib/api/mappers/student";
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
  if (
    (!results?.released && !results?.partial) ||
    !results.scoreProgression.length
  ) {
    return null;
  }

  const chartData = results.scoreProgression;
  const packageSkills = new Set(results.packageSkills);
  const visibleSeries = series.filter(
    (s) => s.key === "overall" || packageSkills.has(s.key as SkillId),
  );
  const delta = results.overallImprovement;
  const deltaPositive = delta > 0;
  const deltaNegative = delta < 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gray-400" />
          <h3 className="font-bold text-gray-900" style={{ fontSize: "15px" }}>
            Score Progression
          </h3>
        </div>
        {delta !== 0 && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              deltaPositive
                ? "bg-emerald-50 text-emerald-700"
                : deltaNegative
                  ? "bg-rose-50 text-rose-700"
                  : "bg-gray-50 text-gray-600"
            }`}
          >
            {deltaPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {deltaPositive ? "+" : ""}
            {delta} overall
          </span>
        )}
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={chartData} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ ...CHART_AXIS_TICK, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 9]}
              ticks={[0, 3, 6, 9]}
              tick={{ ...CHART_AXIS_TICK, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatValue={(v) =>
                    v == null || Number.isNaN(Number(v)) ? "—" : formatBandDisplay(Number(v))
                  }
                />
              }
              cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            />
            {visibleSeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={s.width}
                connectNulls
                dot={s.key === "overall" ? { r: 3.5, fill: s.color, strokeWidth: 0 } : false}
                activeDot={{ r: 5, fill: s.color, stroke: "#fff", strokeWidth: 2 }}
                opacity={s.key === "overall" ? 1 : 0.75}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {visibleSeries.map((s) => (
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
