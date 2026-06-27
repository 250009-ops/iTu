"use client";

import { GraduationCap, ShieldCheck, Ticket, UserPlus } from "lucide-react";
import { useAdminStudents } from "@/contexts/admin-students-context";
import { cn } from "@/lib/utils";

export function StudentsSummaryCards() {
  const { summary } = useAdminStudents();

  const cards = [
    {
      label: "Total Students",
      value: summary.total,
      icon: GraduationCap,
      card: "border-sky-100 bg-sky-50",
      iconWrap: "text-sky-600",
    },
    {
      label: "Email Verified",
      value: summary.verified,
      icon: ShieldCheck,
      card: "border-emerald-100 bg-emerald-50",
      iconWrap: "text-emerald-600",
    },
    {
      label: "With Enrollments",
      value: summary.enrolled,
      icon: Ticket,
      card: "border-violet-100 bg-violet-50",
      iconWrap: "text-violet-600",
    },
    {
      label: "Awaiting First Mock",
      value: summary.awaitingFirstMock,
      icon: UserPlus,
      card: "border-amber-100 bg-amber-50",
      iconWrap: "text-amber-600",
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
