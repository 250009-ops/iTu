"use client";

import {
  ArrowDownLeft,
  CheckCircle2,
  CreditCard,
  Mic,
  PenLine,
} from "lucide-react";
import { useTeacherEarnings } from "@/contexts/teacher-earnings-context";
import { cn } from "@/lib/utils";

const typeConfig = {
  speaking: { icon: Mic, iconBg: "bg-sky-100 text-sky-600" },
  writing: { icon: PenLine, iconBg: "bg-violet-100 text-violet-600" },
  payout: { icon: CreditCard, iconBg: "bg-slate-100 text-slate-600" },
} as const;

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    className: "bg-sky-50 text-sky-700",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  withdrawn: {
    label: "Paid out",
    className: "bg-slate-100 text-slate-600",
    icon: ArrowDownLeft,
  },
} as const;

function formatAmount(amount: number): string {
  const sign = amount >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

export function TransactionHistory() {
  const { earnings } = useTeacherEarnings();
  const { transactions, netThisCycle } = earnings;

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-semibold text-navy">Transaction History</h2>
          <p className="mt-0.5 text-sm text-muted">
            All payment activity for this billing cycle
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Paid out
          </span>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="p-6 text-sm text-muted">No transactions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3 sm:px-6">Date &amp; Time</th>
                <th className="px-5 py-3 sm:px-6">Transaction</th>
                <th className="px-5 py-3 sm:px-6">Reference</th>
                <th className="px-5 py-3 sm:px-6">Status</th>
                <th className="px-5 py-3 text-right sm:px-6">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => {
                const type = typeConfig[tx.type];
                const status = statusConfig[tx.status];
                const TypeIcon = type.icon;
                const StatusIcon = status.icon;

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 sm:px-6">
                      <p className="font-medium text-navy">{tx.date}</p>
                      <p className="text-xs text-muted">{tx.time}</p>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            type.iconBg,
                          )}
                        >
                          <TypeIcon className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div>
                          <p className="font-semibold text-navy">{tx.label}</p>
                          <p className="text-xs text-muted">{tx.detail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted sm:px-6">
                      {tx.reference}
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          status.className,
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-5 py-4 text-right font-semibold sm:px-6",
                        tx.amount >= 0 ? "text-emerald-600" : "text-navy",
                      )}
                    >
                      {formatAmount(tx.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-slate-50">
                <td
                  colSpan={4}
                  className="px-5 py-4 text-sm font-medium text-muted sm:px-6"
                >
                  Net this cycle
                </td>
                <td className="px-5 py-4 text-right text-lg font-bold text-emerald-600 sm:px-6">
                  +${netThisCycle.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
