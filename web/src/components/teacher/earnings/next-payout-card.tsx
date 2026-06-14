"use client";

import { Clock, CreditCard, ExternalLink } from "lucide-react";
import { useTeacherEarnings } from "@/contexts/teacher-earnings-context";
import { useToast } from "@/components/ui/toast";

export function NextPayoutCard() {
  const { toast } = useToast();
  const { earnings } = useTeacherEarnings();
  const nextPayout = earnings.nextPayout;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
          <CreditCard className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="font-semibold text-navy">Next Scheduled Payout</h2>
          <p className="mt-0.5 text-sm text-muted">
            {nextPayout.date} · {nextPayout.bank} · {nextPayout.method}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="text-right">
          <p className="text-xs text-muted">Projected amount</p>
          <p className="text-2xl font-bold text-navy">
            $
            {nextPayout.projectedAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
        {nextPayout.daysRemaining > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            {nextPayout.daysRemaining} days remaining
          </span>
        )}
        <button
          type="button"
          onClick={() =>
            toast("Payout settings", {
              description: `Manage your ${nextPayout.bank} account and schedule soon.`,
              variant: "info",
            })
          }
          className="flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
        >
          Manage
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
