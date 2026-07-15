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
import { useAdminReports } from "@/contexts/admin-reports-context";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  ChartTooltip,
} from "@/components/ui/chart-tooltip";

export function EnrollmentFunnelChart() {
  const { enrollmentFunnel } = useAdminReports();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Enrollment Funnel</h2>
          <p className="mt-0.5 text-sm text-muted">New enrollments vs completed mocks</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
            Enrolled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-navy" />
            Completed
          </span>
        </div>
      </div>

      <div className="mt-4">
        {enrollmentFunnel.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No funnel data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={enrollmentFunnel} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
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
                width={36}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "#f1f5f9", radius: 4 }}
              />
              <Bar
                dataKey="enrolled"
                name="Enrolled"
                fill="#cbd5e1"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                fill="#1b2a4a"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
