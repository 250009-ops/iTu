"use client";

import { CheckCircle2, CircleDot, Loader2, Users } from "lucide-react";
import { useAdminEnrollments } from "@/contexts/admin-enrollments-context";
import { cn } from "@/lib/utils";

export function EnrollmentsSummaryCards() {
  const { summary } = useAdminEnrollments();

  const cards = [
    {
      label: "Total Enrollments",
      value: String(summary.total),
      sub: summary.period,
      icon: Users,
      card: "bg-navy text-white border-navy",
      subClass: "text-white/60",
      dot: null,
    },
    {
      label: "Active Exams",
      value: String(summary.activeExams),
      sub: "Modules running now",
      icon: Loader2,
      card: "border-sky-100 bg-sky-50",
      subClass: "text-muted",
      dot: "bg-sky-500",
    },
    {
      label: "Awaiting Results",
      value: String(summary.awaitingResults),
      sub: "Grading in progress",
      icon: CircleDot,
      card: "border-amber-100 bg-amber-50",
      subClass: "text-muted",
      dot: "bg-amber-500",
    },
    {
      label: "Completed",
      value: String(summary.completed),
      sub: "Results released",
      icon: CheckCircle2,
      card: "border-emerald-100 bg-emerald-50",
      subClass: "text-muted",
      dot: "bg-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isNavy = card.card.startsWith("bg-navy");

        return (
          <div
            key={card.label}
            className={cn("rounded-xl border p-4 shadow-sm sm:p-5", card.card)}
          >
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  isNavy ? "bg-white/10 text-white" : "bg-white text-sky-600 shadow-sm",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              {card.dot && (
                <span className={cn("h-2 w-2 rounded-full", card.dot)} />
              )}
            </div>
            <p
              className={cn(
                "mt-3 text-2xl font-bold",
                isNavy ? "text-white" : "text-navy",
              )}
            >
              {card.value}
            </p>
            <p className={cn("text-sm font-medium", isNavy ? "text-white/80" : "text-foreground")}>
              {card.label}
            </p>
            <p className={cn("mt-0.5 text-xs", card.subClass)}>{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
