"use client";

import { InstitutionActiveExamsTable } from "@/components/institution/monitor/institution-active-exams-table";
import {
  InstitutionIntegrityAlertBanner,
  InstitutionMonitorHeader,
} from "@/components/institution/monitor/institution-monitor-header";
import { InstitutionMonitorSummaryCards } from "@/components/institution/monitor/institution-monitor-summary-cards";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  InstitutionLiveMonitorProvider,
  useInstitutionLiveMonitor,
} from "@/contexts/institution-live-monitor-context";

function LiveMonitorContent() {
  const { loading, error } = useInstitutionLiveMonitor();

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <InstitutionMonitorHeader />
          <InstitutionIntegrityAlertBanner />
          <InstitutionMonitorSummaryCards />
          <InstitutionActiveExamsTable />
      </PortalPage>
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
