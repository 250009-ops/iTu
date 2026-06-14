"use client";

import { TrendingUp } from "lucide-react";
import { moduleBadgeStyles } from "@/lib/admin/constants";
import { useAdminReports } from "@/contexts/admin-reports-context";
import { cn } from "@/lib/utils";

export function ModulePerformanceTable() {
  const { modulePerformance } = useAdminReports();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Module Performance</h2>
        <p className="mt-0.5 text-sm text-muted">
          Exams delivered, avg band, pass rate
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="pb-3 pr-4">Module</th>
              <th className="pb-3 pr-4">Exams</th>
              <th className="pb-3 pr-4">Avg Band</th>
              <th className="pb-3 pr-4">Pass Rate</th>
              <th className="pb-3">MoM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {modulePerformance.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  Module performance data not available yet.
                </td>
              </tr>
            ) : (
              modulePerformance.map((row) => (
                <tr key={row.module}>
                  <td className="py-3.5 pr-4">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        moduleBadgeStyles[row.module],
                      )}
                    >
                      {row.label}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 font-semibold text-navy">
                    {row.exams.toLocaleString()}
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 font-semibold text-navy">
                        {row.avgBand.toFixed(1)}
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${(row.avgBand / 9) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 font-semibold text-navy">
                        {row.passRate}%
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${row.passRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    {row.mom > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                        <TrendingUp className="h-3 w-3" />+{row.mom}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
