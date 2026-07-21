"use client";

import { EnrollmentsHeader } from "@/components/admin/enrollments/enrollments-header";
import { EnrollmentsSummaryCards } from "@/components/admin/enrollments/enrollments-summary-cards";
import { EnrollmentsTable } from "@/components/admin/enrollments/enrollments-table";
import { LifecyclePipeline } from "@/components/admin/enrollments/lifecycle-pipeline";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  AdminEnrollmentsProvider,
  useAdminEnrollments,
} from "@/contexts/admin-enrollments-context";

function EnrollmentsContent() {
  const { loading, error } = useAdminEnrollments();

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <EnrollmentsHeader />
          <EnrollmentsSummaryCards />
          <LifecyclePipeline />
          <EnrollmentsTable />
      </PortalPage>
    </ApiDataShell>
  );
}

export function EnrollmentsView() {
  return (
    <AdminEnrollmentsProvider>
      <EnrollmentsContent />
    </AdminEnrollmentsProvider>
  );
}
