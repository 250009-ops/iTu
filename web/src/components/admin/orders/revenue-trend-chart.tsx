"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminOrders } from "@/contexts/admin-orders-context";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  ChartTooltip,
  formatCurrency,
} from "@/components/ui/chart-tooltip";

export function RevenueTrendChart() {
  const { monthlyOrderTrend } = useAdminOrders();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Revenue Trend</h2>
          <p className="mt-0.5 text-sm text-muted">Monthly order revenue</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-navy" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Orders
          </span>
        </div>
      </div>

      <div className="mt-4">
        {monthlyOrderTrend.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No order trend data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyOrderTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
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
                tickFormatter={(v) => formatCurrency(v)}
              />
              <YAxis
                yAxisId="orders"
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
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "#34d399", stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#1b2a4a"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#1b2a4a", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#1b2a4a", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
