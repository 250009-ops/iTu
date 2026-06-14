"use client";

import {
  AlertCircle,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useAdminOrders } from "@/contexts/admin-orders-context";
import { cn } from "@/lib/utils";

export function OrdersSummaryCards() {
  const { summary } = useAdminOrders();

  const cards = [
    {
      label: "Revenue Collected",
      value: `$${summary.revenueCollected}`,
      sub: `${summary.revenueTrend} vs last month`,
      icon: DollarSign,
      card: "bg-navy text-white border-navy",
      subClass: "text-emerald-300",
      showTrend: true,
    },
    {
      label: "Paid Orders",
      value: String(summary.paidOrders),
      sub: `$${summary.paidTotal} collected`,
      icon: CheckCircle2,
      card: "border-emerald-100 bg-emerald-50",
      subClass: "text-muted",
    },
    {
      label: "Refunds Issued",
      value: String(summary.refundsIssued),
      sub: `$${summary.refundTotal} returned`,
      icon: ArrowDownRight,
      card: "border-border bg-white",
      subClass: "text-muted",
    },
    {
      label: "Failed Payments",
      value: String(summary.failedPayments),
      sub: "Requires follow-up",
      icon: AlertCircle,
      card: "border-rose-100 bg-rose-50",
      subClass: "text-muted",
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
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                isNavy
                  ? "bg-white/10 text-white"
                  : card.card.includes("emerald")
                    ? "bg-white text-emerald-600 shadow-sm"
                    : card.card.includes("rose")
                      ? "bg-white text-rose-600 shadow-sm"
                      : "bg-slate-50 text-slate-500",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <p
              className={cn(
                "mt-3 text-2xl font-bold",
                isNavy ? "text-white" : "text-navy",
              )}
            >
              {card.value}
            </p>
            <p
              className={cn(
                "text-sm font-medium",
                isNavy ? "text-white/80" : "text-foreground",
              )}
            >
              {card.label}
            </p>
            <p
              className={cn(
                "mt-0.5 flex items-center gap-1 text-xs",
                card.subClass,
              )}
            >
              {card.showTrend && (
                <TrendingUp className="h-3 w-3 shrink-0" />
              )}
              {card.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}
