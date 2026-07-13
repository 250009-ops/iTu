"use client";

import { useRouter } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAdminDisputes } from "@/contexts/admin-disputes-context";
import { exportDisputesCsv } from "@/lib/admin/export";

export function DisputesHeader() {
  const { toast } = useToast();
  const { tickets } = useAdminDisputes();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Disputes</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Disputes &amp; Support
        </h1>
        <p className="mt-1 text-sm text-muted">
          Support queue from Student &amp; Teacher Help · SLA tracking · Resolve
          notifies the reporter.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            exportDisputesCsv(tickets);
            toast("Export ready", {
              description: `${tickets.length} tickets downloaded.`,
            });
          }}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push("/admin/help")}
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>
    </div>
  );
}
