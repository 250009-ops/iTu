"use client";

import { CheckCircle2, Clock, Edit3, Layers } from "lucide-react";
import { useAdminContent } from "@/contexts/admin-content-context";
import { cn } from "@/lib/utils";

export function ContentSummaryCards() {
  const { summary } = useAdminContent();

  const cards = [
    {
      label: "Total Tests",
      value: summary.total,
      icon: Layers,
      card: "border-sky-100 bg-sky-50",
      iconWrap: "text-sky-600",
    },
    {
      label: "Published",
      value: summary.published,
      icon: CheckCircle2,
      card: "border-emerald-100 bg-emerald-50",
      iconWrap: "text-emerald-600",
    },
    {
      label: "Under Review",
      value: summary.underReview,
      icon: Clock,
      card: "border-amber-100 bg-amber-50",
      iconWrap: "text-amber-600",
    },
    {
      label: "Drafts",
      value: summary.drafts,
      icon: Edit3,
      card: "border-slate-200 bg-slate-50",
      iconWrap: "text-slate-600",
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
