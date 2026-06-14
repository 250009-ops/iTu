"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminDisputes } from "@/contexts/admin-disputes-context";
import { useToast } from "@/components/ui/toast";

export function SlaAlertBanner() {
  const { summary } = useAdminDisputes();
  const { toast } = useToast();

  if (summary.slaBreached === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-rose-900">
            {summary.slaBreached} ticket{summary.slaBreached > 1 ? "s" : ""} breached SLA
          </p>
          <p className="mt-0.5 text-sm text-rose-800">
            Immediate action required. SLA breach may impact platform rating.
          </p>
        </div>
      </div>
      <Button
        variant="danger"
        size="sm"
        className="shrink-0"
        onClick={() =>
          toast("Overdue tickets", {
            description: `Filtering to ${summary.slaBreached} SLA-breached ticket(s).`,
            variant: "warning",
          })
        }
      >
        View Overdue
      </Button>
    </div>
  );
}
