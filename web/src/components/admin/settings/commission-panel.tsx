"use client";

import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminSettings } from "@/contexts/admin-settings-context";
import { cn } from "@/lib/utils";

const payoutOptions = [
  { value: "weekly", label: "Weekly (Mon)" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

export function CommissionPanel() {
  const { commissionSettings, setField } = useAdminSettings();
  const platformPct = commissionSettings.platformCommission;
  const teacherPct = 100 - platformPct;

  const feeRows = [
    {
      key: "platformCommission" as const,
      label: "Platform Commission",
      tag: "Speaking + Writing",
      hint: "Deducted before teacher payout on every session.",
      prefix: "%",
      value: commissionSettings.platformCommission,
    },
    {
      key: "speakingRate" as const,
      label: "Speaking Teacher Rate",
      tag: "Speaking",
      hint: "Fixed payout per 20-minute speaking session.",
      prefix: "$",
      value: commissionSettings.speakingRate,
    },
    {
      key: "writingRate" as const,
      label: "Writing Teacher Rate",
      tag: "Writing",
      hint: "Fixed payout per written script graded.",
      prefix: "$",
      value: commissionSettings.writingRate,
    },
    {
      key: "disputeRefundCap" as const,
      label: "Dispute Refund Cap",
      tag: "Policy",
      hint: "Maximum refund % admin can issue per dispute.",
      prefix: "%",
      value: commissionSettings.disputeRefundCap,
    },
  ];

  return (
    <div className="p-5 sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Commission &amp; Rates</h2>
        <p className="mt-0.5 text-sm text-muted">
          Platform fee structure and teacher payout configuration.
        </p>
      </div>

      <div className="mt-5 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-900">
          Rate changes apply to <strong>new bookings only</strong>. Confirmed
          sessions are protected at the rate locked at booking.
        </p>
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Revenue Split Visualiser · Per $100 booking
        </p>
        <div className="mt-3 flex h-4 overflow-hidden rounded-full">
          <div className="bg-navy" style={{ width: `${platformPct}%` }} />
          <div className="bg-sky-300" style={{ width: `${teacherPct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-navy" />
            Platform ${platformPct} per booking
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
            Teacher Payout ${teacherPct} per booking
          </span>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {feeRows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-navy">{row.label}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
                  {row.tag}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted">{row.hint}</p>
            </div>
            <div className="relative w-full sm:w-28">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                {row.prefix}
              </span>
              <Input
                type="number"
                value={row.value}
                onChange={(e) =>
                  setField("commission", row.key, Number(e.target.value))
                }
                className="h-9 pl-7 text-right"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Payout Schedule
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {payoutOptions.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                opt.value === commissionSettings.payoutSchedule
                  ? "border-navy bg-navy/5 text-navy"
                  : "border-border text-muted hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name="payout"
                checked={opt.value === commissionSettings.payoutSchedule}
                onChange={() => setField("commission", "payoutSchedule", opt.value)}
                className="accent-navy"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
