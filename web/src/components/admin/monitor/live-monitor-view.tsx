"use client";

import { ActiveExamsTable } from "@/components/admin/monitor/active-exams-table";
import {
  IntegrityAlertBanner,
  MonitorHeader,
} from "@/components/admin/monitor/monitor-header";
import { MonitorSummaryCards } from "@/components/admin/monitor/monitor-summary-cards";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminLiveMonitorProvider,
  useAdminLiveMonitor,
} from "@/contexts/admin-live-monitor-context";

function LiveMonitorContent() {
  const { loading, error } = useAdminLiveMonitor();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <MonitorHeader />
          <IntegrityAlertBanner />
          <MonitorSummaryCards />
          <ActiveExamsTable />
        </div>
      </div>
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
