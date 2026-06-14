"use client";

import { Clock, UserCheck, UserRound, UserX } from "lucide-react";
import { useAdminTeachers } from "@/contexts/admin-teachers-context";
import { cn } from "@/lib/utils";

export function TeachersSummaryCards() {
  const { summary } = useAdminTeachers();

  const cards = [
    {
      label: "Total Teachers",
      value: summary.total,
      icon: UserRound,
      card: "border-sky-100 bg-sky-50",
      iconWrap: "text-sky-600",
    },
    {
      label: "Approved",
      value: summary.approved,
      icon: UserCheck,
      card: "border-emerald-100 bg-emerald-50",
      iconWrap: "text-emerald-600",
    },
    {
      label: "Pending Review",
      value: summary.pendingReview,
      icon: Clock,
      card: "border-amber-100 bg-amber-50",
      iconWrap: "text-amber-600",
    },
    {
      label: "Suspended",
      value: summary.suspended,
      icon: UserX,
      card: "border-rose-100 bg-rose-50",
      iconWrap: "text-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn("rounded-xl border p-4 shadow-sm sm:p-5", card.card)}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm",
                card.iconWrap,
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <p className="mt-3 text-2xl font-bold text-navy">{card.value}</p>
            <p className="text-sm font-medium text-muted">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
