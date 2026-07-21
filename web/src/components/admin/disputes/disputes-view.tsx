"use client";

import { DisputesHeader } from "@/components/admin/disputes/disputes-header";
import { DisputesSummaryCards } from "@/components/admin/disputes/disputes-summary-cards";
import { DisputesTable } from "@/components/admin/disputes/disputes-table";
import { SlaAlertBanner } from "@/components/admin/disputes/sla-alert-banner";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  AdminDisputesProvider,
  useAdminDisputes,
} from "@/contexts/admin-disputes-context";

function DisputesContent() {
  const { loading, error } = useAdminDisputes();

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <DisputesHeader />
          <SlaAlertBanner />
          <DisputesSummaryCards />
          <DisputesTable />
      </PortalPage>
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
