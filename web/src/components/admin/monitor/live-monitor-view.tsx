"use client";

import { ActiveExamsTable } from "@/components/admin/monitor/active-exams-table";
import {
  IntegrityAlertBanner,
  MonitorHeader,
} from "@/components/admin/monitor/monitor-header";
import { MonitorSummaryCards } from "@/components/admin/monitor/monitor-summary-cards";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  AdminLiveMonitorProvider,
  useAdminLiveMonitor,
} from "@/contexts/admin-live-monitor-context";

function LiveMonitorContent() {
  const { loading, error } = useAdminLiveMonitor();

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <MonitorHeader />
          <IntegrityAlertBanner />
          <MonitorSummaryCards />
          <ActiveExamsTable />
      </PortalPage>
    </ApiDataShell>
  );
}

export function LiveMonitorView() {
  return (
    <AdminLiveMonitorProvider>
      <LiveMonitorContent />
    </AdminLiveMonitorProvider>
  );
}
