"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAdminOrders } from "@/contexts/admin-orders-context";
import { exportOrdersCsv } from "@/lib/admin/export";

export function OrdersHeader() {
  const { toast } = useToast();
  const { filteredOrders, filtersActive } = useAdminOrders();

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
          variant="primary"
          size="sm"
          onClick={() => {
            exportOrdersCsv(filteredOrders);
            toast("Export ready", {
              description: `${filteredOrders.length} order${filteredOrders.length !== 1 ? "s" : ""} downloaded${filtersActive ? " (filtered)" : ""}.`,
            });
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
