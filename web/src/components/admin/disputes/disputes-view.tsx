"use client";

import { DisputesHeader } from "@/components/admin/disputes/disputes-header";
import { DisputesSummaryCards } from "@/components/admin/disputes/disputes-summary-cards";
import { DisputesTable } from "@/components/admin/disputes/disputes-table";
import { SlaAlertBanner } from "@/components/admin/disputes/sla-alert-banner";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminDisputesProvider,
  useAdminDisputes,
} from "@/contexts/admin-disputes-context";

function DisputesContent() {
  const { loading, error } = useAdminDisputes();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <DisputesHeader />
          <SlaAlertBanner />
          <DisputesSummaryCards />
          <DisputesTable />
        </div>
      </div>
    </ApiDataShell>
  );
}

export function DisputesView() {
  return (
    <AdminDisputesProvider>
      <DisputesContent />
    </AdminDisputesProvider>
  );
}
