"use client";

import { useMemo, useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useAdminOrders } from "@/contexts/admin-orders-context";
import type { AdminPayout } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const statusStyles: Record<
  string,
  { label: string; dot: string; pill: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700",
  },
  processing: {
    label: "Processing",
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700",
  },
  paid: {
    label: "Paid",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
  },
  failed: {
    label: "Failed",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700",
  },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PayoutsTable() {
  const { payouts, payoutsLoading, markPayoutPaid } = useAdminOrders();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<AdminPayout | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = useMemo(
    () => payouts.filter((p) => p.status === "pending" || p.status === "processing"),
    [payouts],
  );

  async function confirmMarkPaid() {
    if (!confirming) return;
    const target = confirming;
    setBusy(true);
    try {
      await markPayoutPaid(target.id);
      toast(`${target.teacherName} payout marked paid`, {
        description: `$${target.amount.toFixed(2)} ${target.currency}`,
        variant: "success",
      });
      setConfirming(null);
    } catch (err) {
      toast("Failed to update payout", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold text-navy">Teacher Payouts</h2>
        <p className="mt-0.5 text-sm text-muted">
          {pending.length} payout{pending.length !== 1 ? "s" : ""} awaiting
          processing.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Teacher</th>
              <th className="px-5 py-3 sm:px-6">Period</th>
              <th className="px-5 py-3 sm:px-6">Amount</th>
              <th className="px-5 py-3 sm:px-6">Status</th>
              <th className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payoutsLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted sm:px-6">
                  Loading payouts…
                </td>
              </tr>
            ) : payouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted sm:px-6">
                  No payouts yet.
                </td>
              </tr>
            ) : (
              payouts.map((payout) => {
                const status = statusStyles[payout.status] ?? statusStyles.pending;
                const canMarkPaid =
                  payout.status === "pending" || payout.status === "processing";
                return (
                  <tr key={payout.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-semibold text-navy sm:px-6">
                      {payout.teacherName}
                    </td>
                    <td className="px-5 py-4 text-muted sm:px-6">
                      {formatDate(payout.periodStart)} –{" "}
                      {formatDate(payout.periodEnd)}
                    </td>
                    <td className="px-5 py-4 font-bold tabular-nums text-navy sm:px-6">
                      ${payout.amount.toFixed(2)}{" "}
                      <span className="text-xs font-normal text-muted">
                        {payout.currency}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          status.pill,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 sm:px-6">
                      <div className="flex justify-end">
                        {canMarkPaid ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => setConfirming(payout)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Mark Paid
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">
                            {payout.paidAt
                              ? `Paid ${formatDate(payout.paidAt)}`
                              : "—"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        title={
          confirming
            ? `Mark ${confirming.teacherName}'s payout as paid?`
            : ""
        }
        message={
          confirming
            ? `Confirm $${confirming.amount.toFixed(2)} ${confirming.currency} has been transferred.`
            : ""
        }
        confirmLabel={busy ? "Saving…" : "Mark as paid"}
        onConfirm={confirmMarkPaid}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
