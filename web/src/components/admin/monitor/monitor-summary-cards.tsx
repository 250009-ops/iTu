"use client";

import { Activity, AlertTriangle, Clock, User } from "lucide-react";
import { useAdminLiveMonitor } from "@/contexts/admin-live-monitor-context";
import { cn } from "@/lib/utils";

const iconMap = {
  activity: Activity,
  alert: AlertTriangle,
  clock: Clock,
  user: User,
};

const toneStyles = {
  sky: "border-sky-100 bg-sky-50 text-sky-600",
  rose: "border-rose-100 bg-rose-50 text-rose-600",
  amber: "border-amber-100 bg-amber-50 text-amber-600",
  violet: "border-violet-100 bg-violet-50 text-violet-600",
};

export function MonitorSummaryCards() {
  const { monitorSummary } = useAdminLiveMonitor();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {monitorSummary.map((card) => {
        const Icon = iconMap[card.icon];
        return (
          <div
            key={card.id}
            className={cn(
              "rounded-xl border p-4 shadow-sm sm:p-5",
              toneStyles[card.tone],
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            <p className="mt-3 text-2xl font-bold text-navy">{card.value}</p>
            <p className="text-sm font-medium text-muted">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
