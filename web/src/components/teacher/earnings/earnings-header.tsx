"use client";

import { useState } from "react";
import { Download, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTeacherEarnings } from "@/contexts/teacher-earnings-context";
import { useToast } from "@/components/ui/toast";
import { exportEarningsCsv } from "@/lib/teacher/export";
import { requestTeacherPayout } from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";

export function EarningsHeader() {
  const { toast } = useToast();
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { earnings, refresh } = useTeacherEarnings();
  const { billingCycle, nextPayout, transactions } = earnings;

  async function handleRequestPayout() {
    setPayoutOpen(false);
    setRequesting(true);
    try {
      const result = await requestTeacherPayout();
      toast("Payout requested", {
        description: `$${result.amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })} queued · our finance team will process it within 2 business days.`,
        variant: "success",
      });
      await refresh();
    } catch (err) {
      toast("Could not request payout", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">
          Teacher Portal &gt; Earnings &amp; Payments
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Earnings &amp; Payments
        </h1>
        <p className="mt-1 text-sm text-muted">Billing cycle: {billingCycle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={transactions.length === 0}
          onClick={() => {
            exportEarningsCsv(transactions);
            toast("Export ready", {
              description: "Your earnings CSV has been downloaded.",
              variant: "success",
            });
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={requesting}
          onClick={() => setPayoutOpen(true)}
        >
          <DollarSign className="h-4 w-4" />
          Request Payout
        </Button>
      </div>

      <ConfirmDialog
        open={payoutOpen}
        title="Request payout"
        message={`Request an early payout of $${nextPayout.projectedAmount.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2 },
        )} to ${nextPayout.bank}?`}
        confirmLabel="Request payout"
        onConfirm={handleRequestPayout}
        onCancel={() => setPayoutOpen(false)}
      />
    </div>
  );
}
