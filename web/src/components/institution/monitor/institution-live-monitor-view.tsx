"use client";

import { InstitutionActiveExamsTable } from "@/components/institution/monitor/institution-active-exams-table";
import {
  InstitutionIntegrityAlertBanner,
  InstitutionMonitorHeader,
} from "@/components/institution/monitor/institution-monitor-header";
import { InstitutionMonitorSummaryCards } from "@/components/institution/monitor/institution-monitor-summary-cards";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  InstitutionLiveMonitorProvider,
  useInstitutionLiveMonitor,
} from "@/contexts/institution-live-monitor-context";

function LiveMonitorContent() {
  const { loading, error } = useInstitutionLiveMonitor();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <InstitutionMonitorHeader />
          <InstitutionIntegrityAlertBanner />
          <InstitutionMonitorSummaryCards />
          <InstitutionActiveExamsTable />
        </div>
      </div>
    </ApiDataShell>
  );
}

export function InstitutionLiveMonitorView() {
  return (
    <InstitutionLiveMonitorProvider>
      <LiveMonitorContent />
    </InstitutionLiveMonitorProvider>
  );
}
