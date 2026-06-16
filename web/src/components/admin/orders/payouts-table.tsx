"use client";

import { useMemo, useState } from "react";
import { CheckCircle, RotateCcw, XCircle } from "lucide-react";
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

type ConfirmAction = {
  payout: AdminPayout;
  status: "PAID" | "FAILED" | "PENDING";
  title: string;
  message: string;
  confirmLabel: string;
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
  const { payouts, payoutsLoading, markPayoutPaid, updatePayout } =
    useAdminOrders();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = useMemo(
    () =>
      payouts.filter(
        (p) => p.status === "pending" || p.status === "processing",
      ),
    [payouts],
  );

  async function confirmAction() {
    if (!confirming) return;
    const { payout, status } = confirming;
    setBusy(true);
    try {
      if (status === "PAID") {
        await markPayoutPaid(payout.id);
      } else {
        await updatePayout(payout.id, status);
      }
      toast(
        status === "PAID"
          ? `${payout.teacherName} payout marked paid`
          : status === "FAILED"
            ? `${payout.teacherName} payout marked failed`
            : `${payout.teacherName} payout reopened`,
        {
          description: `$${payout.amount.toFixed(2)} ${payout.currency}`,
          variant: status === "FAILED" ? "warning" : "success",
        },
      );
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
                const canMarkFailed =
                  payout.status === "pending" || payout.status === "processing";
                const canReopen = payout.status === "failed";

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
                      <div className="flex justify-end gap-2">
                        {canMarkPaid && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() =>
                              setConfirming({
                                payout,
                                status: "PAID",
                                title: `Mark ${payout.teacherName}'s payout as paid?`,
                                message: `Confirm $${payout.amount.toFixed(2)} ${payout.currency} has been transferred.`,
                                confirmLabel: "Mark as paid",
                              })
                            }
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Paid
                          </Button>
                        )}
                        {canMarkFailed && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() =>
                              setConfirming({
                                payout,
                                status: "FAILED",
                                title: `Mark ${payout.teacherName}'s payout as failed?`,
                                message: "The teacher will be notified to update their bank details.",
                                confirmLabel: "Mark failed",
                              })
                            }
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Failed
                          </Button>
                        )}
                        {canReopen && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8"
                            onClick={() =>
                              setConfirming({
                                payout,
                                status: "PENDING",
                                title: `Reopen ${payout.teacherName}'s payout?`,
                                message: "This returns the payout to pending for another transfer attempt.",
                                confirmLabel: "Reopen",
                              })
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retry
                          </Button>
                        )}
                        {!canMarkPaid && !canMarkFailed && !canReopen && (
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
        title={confirming?.title ?? ""}
        message={confirming?.message ?? ""}
        confirmLabel={busy ? "Saving…" : confirming?.confirmLabel ?? "Confirm"}
        onConfirm={confirmAction}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
