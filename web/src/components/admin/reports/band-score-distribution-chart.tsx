"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
} from "@/components/ui/chart-tooltip";

export function BandScoreDistributionChart() {
  const { bandScoreDistribution } = useAdminReports();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Band Score Distribution</h2>
          <p className="mt-0.5 text-sm text-muted">Released results in selected period</p>
      </div>

      <div className="mt-4">
        {bandScoreDistribution.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            Band distribution data not available yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bandScoreDistribution} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="score"
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "#f1f5f9", radius: 4 }}
              />
              <Bar
                dataKey="count"
                name="Students"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {bandScoreDistribution.map((item) => (
                  <Cell
                    key={item.score}
                    fill={item.highlight ? "#1b2a4a" : "#e2e8f0"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
