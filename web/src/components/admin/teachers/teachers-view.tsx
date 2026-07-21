"use client";

import { ExaminersTable } from "@/components/admin/teachers/examiners-table";
import { TeachersHeader } from "@/components/admin/teachers/teachers-header";
import { TeachersSummaryCards } from "@/components/admin/teachers/teachers-summary-cards";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  AdminTeachersProvider,
  useAdminTeachers,
} from "@/contexts/admin-teachers-context";

function TeachersContent() {
  const { loading, error } = useAdminTeachers();

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <TeachersHeader />
          <TeachersSummaryCards />
          <ExaminersTable />
      </PortalPage>
    </ApiDataShell>
  );
}

export function TeachersView() {
  return (
    <AdminTeachersProvider>
      <TeachersContent />
    </AdminTeachersProvider>
  );
}
