"use client";

import {
  AlertCircle,
  ArrowDownRight,
  CheckCircle2,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useAdminOrders } from "@/contexts/admin-orders-context";
import type { OrderStatus } from "@/lib/admin/types";
import { formatPrice, DEFAULT_CURRENCY } from "@/lib/format-price";
import { cn } from "@/lib/utils";

export function OrdersSummaryCards() {
  const { summary, statusFilter, setStatusFilter, focusLedgerFilters } =
    useAdminOrders();

  const trendIsUp =
    summary.revenueTrend.startsWith("+") || summary.revenueTrend === "0%";
  const trendIsFlat = summary.revenueTrend === "—";

  const cards: {
    label: string;
    value: string;
    sub: string;
    icon: typeof DollarSign;
    card: string;
    subClass: string;
    showTrend?: boolean;
    trendUp?: boolean;
    filter: "all" | OrderStatus;
  }[] = [
    {
      label: "Revenue Collected",
      value: formatPrice(Number(summary.revenueCollected), DEFAULT_CURRENCY),
      sub: `${summary.revenueTrend} vs last month`,
      icon: DollarSign,
      card: "bg-navy text-white border-navy",
      subClass: trendIsFlat
        ? "text-white/60"
        : trendIsUp
          ? "text-emerald-300"
          : "text-rose-300",
      showTrend: !trendIsFlat,
      trendUp: trendIsUp,
      filter: "paid",
    },
    {
      label: "Paid Orders",
      value: String(summary.paidOrders),
      sub: `${formatPrice(Number(summary.paidTotal), DEFAULT_CURRENCY)} collected`,
      icon: CheckCircle2,
      card: "border-emerald-100 bg-emerald-50",
      subClass: "text-muted",
      filter: "paid",
    },
    {
      label: "Refunds Issued",
      value: String(summary.refundsIssued),
      sub: `${formatPrice(Number(summary.refundTotal), DEFAULT_CURRENCY)} returned`,
      icon: ArrowDownRight,
      card: "border-border bg-white",
      subClass: "text-muted",
      filter: "refunded",
    },
    {
      label: "Failed Payments",
      value: String(summary.failedPayments),
      sub: "Requires follow-up",
      icon: AlertCircle,
      card: "border-rose-100 bg-rose-50",
      subClass: "text-muted",
      filter: "failed",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isNavy = card.card.startsWith("bg-navy");
        const active = statusFilter === card.filter;

        return (
          <button
            key={card.label}
            type="button"
            onClick={() => {
              setStatusFilter(
                statusFilter === card.filter ? "all" : card.filter,
              );
              focusLedgerFilters();
            }}
            className={cn(
              "rounded-xl border p-4 text-left shadow-sm transition-shadow sm:p-5",
              card.card,
              active && "ring-2 ring-navy/30 ring-offset-2",
              "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40",
            )}
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
              {card.showTrend &&
                (card.trendUp ? (
                  <TrendingUp className="h-3 w-3 shrink-0" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 shrink-0" />
                ))}
              {card.sub}
            </p>
          </button>
        );
      })}
    </div>
  );
}
