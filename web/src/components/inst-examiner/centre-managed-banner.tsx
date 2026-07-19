"use client";

import { ShieldCheck } from "lucide-react";
import { useProfilePortal } from "@/contexts/profile-portal-context";

export function CentreManagedBanner() {
  const { centerName } = useProfilePortal();
  const name = centerName ?? "your centre";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="text-sm text-slate-600">
          <p className="font-semibold text-navy">Earnings managed by {name}</p>
          <p className="mt-0.5">
            Your payout schedule and invoicing are handled by {name}. Contact
            your centre coordinator for payment inquiries or scheduling changes.
          </p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700">
        <ShieldCheck className="h-3.5 w-3.5" /> Centre-managed
      </span>
    </div>
  );
}
