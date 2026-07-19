"use client";

import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTeacherProfile } from "@/contexts/teacher-profile-context";
import { useProfilePortal } from "@/contexts/profile-portal-context";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  ChartTooltip,
} from "@/components/ui/chart-tooltip";

export function SessionActivityChart() {
  const { profile } = useTeacherProfile();
  const { variant } = useProfilePortal();
  const { sessionActivity } = profile;
  const isCentre = variant === "centre";

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Session Activity</h2>
          <p className="mt-0.5 text-sm text-muted">Sessions conducted</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          <TrendingUp className="h-3.5 w-3.5" />
          {sessionActivity.trend}
        </span>
      </div>

      <div className="mt-4">
        {sessionActivity.hasData ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sessionActivity.months} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
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
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "#f1f5f9", radius: 4 }}
              />
              <Bar
                dataKey="count"
                name="Sessions"
                fill="#1b2a4a"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-border bg-slate-50/60 px-6 text-center text-sm text-muted">
            {isCentre
              ? "Graded centre sessions will appear here once you complete Writing or Speaking work."
              : "Graded sessions will appear here once you complete Writing or Speaking work."}
          </div>
        )}
      </div>
    </div>
  );
}
