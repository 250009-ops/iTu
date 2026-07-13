"use client";

import {
  Award,
  DollarSign,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAdminReports } from "@/contexts/admin-reports-context";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";

export function ReportsSummaryCards() {
  const { summary } = useAdminReports();

  const cards = [
    {
      label: "Revenue MTD",
      value: formatPrice(summary.revenueMtd),
      sub: `${summary.revenueTrend} vs last month`,
      icon: DollarSign,
      card: "bg-navy text-white border-navy",
      subClass: "text-emerald-300",
      trend: summary.revenueTrend,
      isNavy: true,
    },
    {
      label: "Exams Delivered",
      value: String(summary.examsDelivered),
      sub: summary.examsPeriod,
      icon: GraduationCap,
      card: "border-sky-100 bg-sky-50",
      subClass: "text-muted",
      trend: summary.examsTrend,
      isNavy: false,
    },
    {
      label: "Avg Band Score",
      value: summary.avgBandScore > 0 ? String(summary.avgBandScore) : "—",
      sub: summary.avgBandSub,
      icon: Award,
      card: "border-violet-100 bg-violet-50",
      subClass: "text-muted",
      trend: summary.avgBandTrend,
      isNavy: false,
    },
    {
      label: "Student Satisfaction",
      value: summary.satisfaction > 0 ? `${summary.satisfaction}%` : "—",
      sub: summary.satisfactionSub,
      icon: Users,
      card: "border-amber-100 bg-amber-50",
      subClass: "text-muted",
      trend: summary.satisfactionTrend,
      isNavy: false,
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
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  card.isNavy
                    ? "bg-white/10 text-white"
                    : "bg-white text-navy shadow-sm",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              {card.trend !== "—" && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                    card.isNavy
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  <TrendingUp className="h-3 w-3" />
                  {card.trend}
                </span>
              )}
            </div>
            <p
              className={cn(
                "mt-3 text-2xl font-bold",
                card.isNavy ? "text-white" : "text-navy",
              )}
            >
              {card.value}
            </p>
            <p
              className={cn(
                "text-sm font-medium",
                card.isNavy ? "text-white/80" : "text-foreground",
              )}
            >
              {card.label}
            </p>
            <p className={cn("mt-0.5 text-xs", card.subClass)}>{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
