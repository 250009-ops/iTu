"use client";

import { StudentsHeader } from "@/components/admin/students/students-header";
import { StudentsSummaryCards } from "@/components/admin/students/students-summary-cards";
import { StudentsTable } from "@/components/admin/students/students-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import {
  AdminStudentsProvider,
  useAdminStudents,
} from "@/contexts/admin-students-context";

function StudentsContent() {
  const { loading, error } = useAdminStudents();

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <StudentsHeader />
          <StudentsSummaryCards />
          <StudentsTable />
      </PortalPage>
    </ApiDataShell>
  );
}

export function StudentsView() {
  return (
    <AdminStudentsProvider>
      <StudentsContent />
    </AdminStudentsProvider>
  );
}
