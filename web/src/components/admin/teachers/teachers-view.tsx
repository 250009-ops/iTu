"use client";

import { ExaminersTable } from "@/components/admin/teachers/examiners-table";
import { TeachersHeader } from "@/components/admin/teachers/teachers-header";
import { TeachersSummaryCards } from "@/components/admin/teachers/teachers-summary-cards";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminTeachersProvider,
  useAdminTeachers,
} from "@/contexts/admin-teachers-context";

function TeachersContent() {
  const { loading, error } = useAdminTeachers();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <TeachersHeader />
          <TeachersSummaryCards />
          <ExaminersTable />
        </div>
      </div>
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
