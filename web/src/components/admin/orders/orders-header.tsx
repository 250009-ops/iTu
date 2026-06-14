"use client";

import { Download, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function OrdersHeader() {
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Orders</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Orders &amp; Payments
        </h1>
        <p className="mt-1 text-sm text-muted">
          Financial records — payment transactions, invoices, and refund
          management.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            toast("Filters", {
              description: "Filter transactions by status and date in the table.",
              variant: "info",
            })
          }
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            toast("Export started", {
              description: "Your transactions CSV will download shortly.",
            })
          }
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
