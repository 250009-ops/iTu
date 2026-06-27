"use client";

import { DollarSign, Mic, PenLine, Star } from "lucide-react";
import { useTeacherDashboard } from "@/contexts/teacher-dashboard-context";
import { cn } from "@/lib/utils";

const toneStyles = {
  sky: {
    card: "border-sky-100 bg-sky-50",
    icon: "bg-sky-100 text-sky-600",
  },
  violet: {
    card: "border-violet-100 bg-violet-50",
    icon: "bg-violet-100 text-violet-600",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
  },
  amber: {
    card: "border-amber-100 bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
  },
  rose: {
    card: "border-rose-100 bg-rose-50",
    icon: "bg-rose-100 text-rose-600",
  },
};

const iconMap = {
  sessions: Mic,
  writing: PenLine,
  speaking: Mic,
  earnings: DollarSign,
  rating: Star,
};

export function TeacherStatCards() {
  const { teacherStats } = useTeacherDashboard();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {teacherStats.map((stat) => {
        const styles = toneStyles[stat.tone];
        const Icon = iconMap[stat.id as keyof typeof iconMap];

        return (
          <div
            key={stat.id}
            className={cn("rounded-xl border p-5 shadow-sm", styles.card)}
          >
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  styles.icon,
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              {stat.trend && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {stat.trend}
                </span>
              )}
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-navy">
              {stat.value}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{stat.label}</p>
            <p className="mt-0.5 text-xs text-muted">{stat.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
