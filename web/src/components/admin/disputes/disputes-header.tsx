"use client";

import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DisputesHeader() {
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted">Admin &gt; Disputes</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
          Disputes &amp; Support
        </h1>
        <p className="mt-1 text-sm text-muted">
          Ticket queue · SLA tracking · Resolution management.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            toast("Export started", {
              description: "Your tickets export will download shortly.",
            })
          }
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            toast("New ticket", {
              description: "Open a support ticket on behalf of a user soon.",
              variant: "info",
            })
          }
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>
    </div>
  );
}
