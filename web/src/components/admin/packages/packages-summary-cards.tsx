"use client";

import { CircleDollarSign, Layers, Sparkles, Tag } from "lucide-react";
import { useAdminPackages } from "@/contexts/admin-packages-context";
import { cn } from "@/lib/utils";

export function PackagesSummaryCards() {
  const { summary } = useAdminPackages();

  const cards = [
    {
      label: "Total Packages",
      value: String(summary.total),
      icon: Layers,
      card: "border-sky-100 bg-sky-50",
      iconWrap: "text-sky-600",
    },
    {
      label: "Active",
      value: String(summary.active),
      icon: Tag,
      card: "border-emerald-100 bg-emerald-50",
      iconWrap: "text-emerald-600",
    },
    {
      label: "Most Popular",
      value: String(summary.mostPopular),
      icon: Sparkles,
      card: "border-amber-100 bg-amber-50",
      iconWrap: "text-amber-600",
    },
    {
      label: "Avg Price (active)",
      value: `$${summary.avgPrice.toLocaleString()}`,
      icon: CircleDollarSign,
      card: "border-violet-100 bg-violet-50",
      iconWrap: "text-violet-600",
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
