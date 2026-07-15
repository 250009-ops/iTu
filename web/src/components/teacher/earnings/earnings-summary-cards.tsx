"use client";

import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useTeacherEarnings } from "@/contexts/teacher-earnings-context";
import { formatPrice } from "@/lib/format-price";

function TrendBadge({ value }: { value: string }) {
  if (value === "—") return null;
  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
      <ArrowUpRight className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}

export function EarningsSummaryCards() {
  const { earnings } = useTeacherEarnings();
  const { summary } = earnings;
  const { availableBalance, lockedBalance, thisMonth, allTimeEarned, avgPerSession, currency } =
    summary;
  const hasBalance = availableBalance > 0;
  const hasLocked = (lockedBalance ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl bg-navy p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <DollarSign className="h-5 w-5" strokeWidth={1.75} />
          </div>
          {hasBalance ? (
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
              Available
            </span>
          ) : null}
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight">
          {formatPrice(availableBalance, currency)}
        </p>
        <p className="mt-1 text-sm font-medium text-white/80">Available Balance</p>
        {hasLocked ? (
          <p className="mt-1 text-xs text-white/60">
            {formatPrice(lockedBalance ?? 0, currency)} locked this period
          </p>
        ) : null}
        <p
          className={`mt-2 flex items-center gap-1.5 text-xs ${
            hasBalance ? "text-emerald-300" : "text-white/60"
          }`}
        >
          {hasBalance ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : null}
          {summary.availableHint}
        </p>
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
            <BarChart3 className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <TrendBadge value={summary.thisMonthTrend} />
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight text-navy">
          {formatPrice(thisMonth, currency)}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">This Month</p>
        <p className="mt-0.5 text-xs text-muted">{summary.thisMonthLabel}</p>
      </div>

      <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
            <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <TrendBadge value={summary.allTimeTrend} />
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight text-navy">
          {formatPrice(allTimeEarned, currency)}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">All-Time Earned</p>
        <p className="mt-0.5 text-xs text-muted">{summary.allTimeSub}</p>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
            <Zap className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <TrendBadge value={summary.avgTrend} />
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight text-navy">
          {avgPerSession != null
            ? formatPrice(avgPerSession, currency)
            : "—"}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">Avg per Session</p>
        <p className="mt-0.5 text-xs text-muted">{summary.avgSub}</p>
      </div>
    </div>
  );
}
