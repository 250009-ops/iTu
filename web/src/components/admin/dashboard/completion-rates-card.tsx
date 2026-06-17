"use client";

import { useAdminDashboard } from "@/contexts/admin-dashboard-context";
import { cn } from "@/lib/utils";

const barColors = {
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
};

export function CompletionRatesCard() {
  const { completionRates } = useAdminDashboard();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-semibold text-navy">Completion Rates</h2>
      <p className="mt-0.5 text-sm text-muted">
        Among mocks scheduled this month
      </p>

      <ul className="mt-5 space-y-4">
        {completionRates.map((item) => (
          <li key={item.skill}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-navy">{item.skill}</span>
              <span className="font-bold text-navy">{item.pct}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full", barColors[item.color])}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
