"use client";

import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useAdminDisputes } from "@/contexts/admin-disputes-context";
import { cn } from "@/lib/utils";

export function DisputesSummaryCards() {
  const { summary, ticketsByType } = useAdminDisputes();

  const statCards = [
    {
      label: "Open Tickets",
      value: String(summary.openTickets),
      sub: `${summary.urgentOpen} urgent`,
      icon: AlertCircle,
      card: "border-rose-100 bg-rose-50",
      iconWrap: "bg-white text-rose-600 shadow-sm",
      dot: "bg-rose-500",
    },
    {
      label: "In Progress",
      value: String(summary.inProgress),
      sub: "Being handled",
      icon: Clock,
      card: "border-sky-100 bg-sky-50",
      iconWrap: "bg-white text-sky-600 shadow-sm",
      dot: null,
    },
    {
      label: "Resolved",
      value: String(summary.resolvedThisMonth),
      sub: "This month",
      icon: CheckCircle2,
      card: "border-emerald-100 bg-emerald-50",
      iconWrap: "bg-white text-emerald-600 shadow-sm",
      dot: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {statCards.map((card) => {
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
                  card.iconWrap,
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              {card.dot && (
                <span className={cn("h-2 w-2 rounded-full", card.dot)} />
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-navy">{card.value}</p>
            <p className="text-sm font-medium text-foreground">{card.label}</p>
            <p className="mt-0.5 text-xs text-muted">{card.sub}</p>
          </div>
        );
      })}

      <div className="col-span-2 rounded-xl border border-border bg-white p-4 shadow-sm sm:p-5 lg:col-span-1">
        <p className="text-sm font-medium text-foreground">By Type</p>
        <p className="mt-0.5 text-xs text-muted">Ticket distribution</p>
        <ul className="mt-4 space-y-3">
          {ticketsByType.length === 0 ? (
            <li className="text-xs text-muted">No tickets yet.</li>
          ) : (
            ticketsByType.map((item) => (
              <li key={item.type}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-navy">{item.type}</span>
                  <span className="font-semibold text-muted">{item.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${(item.count / item.max) * 100}%` }}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
