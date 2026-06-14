"use client";

import { BandScoreDistributionChart } from "@/components/admin/reports/band-score-distribution-chart";
import { EnrollmentFunnelChart } from "@/components/admin/reports/enrollment-funnel-chart";
import { ModulePerformanceTable } from "@/components/admin/reports/module-performance-table";
import { ReportsHeader } from "@/components/admin/reports/reports-header";
import { ReportsSummaryCards } from "@/components/admin/reports/reports-summary-cards";
import { RevenueExamVolumeChart } from "@/components/admin/reports/revenue-exam-volume-chart";
import { TeacherLeaderboardTable } from "@/components/admin/reports/teacher-leaderboard-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminReportsProvider,
  useAdminReports,
} from "@/contexts/admin-reports-context";

function ReportsContent() {
  const { loading, error } = useAdminReports();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <ReportsHeader />
          <ReportsSummaryCards />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RevenueExamVolumeChart />
            </div>
            <div className="lg:col-span-2">
              <BandScoreDistributionChart />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <EnrollmentFunnelChart />
            <ModulePerformanceTable />
          </div>
          <TeacherLeaderboardTable />
        </div>
      </div>
    </ApiDataShell>
  );
}

export function ReportsView() {
  return (
    <AdminReportsProvider>
      <ReportsContent />
    </AdminReportsProvider>
  );
}
