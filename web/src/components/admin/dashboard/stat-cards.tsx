"use client";

import { useAdminDashboard } from "@/contexts/admin-dashboard-context";
import { cn } from "@/lib/utils";

const toneStyles = {
  navy: {
    card: "bg-navy text-white border-navy",
    sub: "text-white/60",
    trend: "bg-emerald-500/20 text-emerald-300",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50",
    sub: "text-muted",
    trend: "bg-emerald-100 text-emerald-700",
  },
  violet: {
    card: "border-violet-100 bg-violet-50",
    sub: "text-muted",
    trend: "bg-violet-100 text-violet-700",
  },
  amber: {
    card: "border-amber-100 bg-amber-50",
    sub: "text-muted",
    trend: "bg-amber-100 text-amber-700",
  },
};

export function StatCards() {
  const { adminStats } = useAdminDashboard();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {adminStats.map((stat) => {
        const styles = toneStyles[stat.tone];
        const isNavy = stat.tone === "navy";

        return (
          <div
            key={stat.id}
            className={cn("rounded-xl border p-5 shadow-sm", styles.card)}
          >
            <div className="flex items-start justify-between">
              <p className={cn("text-sm font-medium", isNavy ? "text-white/80" : "text-muted")}>
                {stat.label}
              </p>
              {"live" in stat && stat.live && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live
                </span>
              )}
            </div>
            <p className={cn("mt-3 text-3xl font-bold tracking-tight", isNavy ? "text-white" : "text-navy")}>
              {stat.value}
            </p>
            <p className={cn("mt-1 text-xs", styles.sub)}>{stat.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
