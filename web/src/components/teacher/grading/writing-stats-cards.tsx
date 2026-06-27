"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { useTeacherGrading } from "@/contexts/teacher-grading-context";
import { cn } from "@/lib/utils";

export function WritingStatsCards() {
  const { hub } = useTeacherGrading();
  const { stats } = hub;

  const cards = [
    {
      label: "Pending grading",
      value: String(stats.pendingGrading),
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "On-time SLA",
      value: `${stats.onTimeSlaPercent}%`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Avg turnaround",
      value: stats.overdueCount > 0 ? "Overdue" : "On track",
      icon: AlertTriangle,
      iconBg: stats.overdueCount > 0 ? "bg-red-50" : "bg-slate-50",
      iconColor: stats.overdueCount > 0 ? "text-red-600" : "text-slate-500",
      warn: stats.overdueCount > 0,
    },
    {
      label: "Graded this period",
      value: String(stats.gradedThisPeriod),
      icon: FileText,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                card.iconBg,
              )}
            >
              <card.icon className={cn("h-5 w-5", card.iconColor)} />
            </div>
            <div>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums text-navy",
                  card.warn && "text-red-600",
                )}
              >
                {card.warn && "⚠ "}
                {card.value}
              </p>
              <p className="mt-0.5 text-sm text-muted">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
