"use client";

import { EnrollmentsHeader } from "@/components/admin/enrollments/enrollments-header";
import { EnrollmentsSummaryCards } from "@/components/admin/enrollments/enrollments-summary-cards";
import { EnrollmentsTable } from "@/components/admin/enrollments/enrollments-table";
import { LifecyclePipeline } from "@/components/admin/enrollments/lifecycle-pipeline";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminEnrollmentsProvider,
  useAdminEnrollments,
} from "@/contexts/admin-enrollments-context";

function EnrollmentsContent() {
  const { loading, error } = useAdminEnrollments();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <EnrollmentsHeader />
          <EnrollmentsSummaryCards />
          <LifecyclePipeline />
          <EnrollmentsTable />
        </div>
      </div>
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
