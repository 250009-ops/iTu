"use client";

import { StudentsHeader } from "@/components/admin/students/students-header";
import { StudentsSummaryCards } from "@/components/admin/students/students-summary-cards";
import { StudentsTable } from "@/components/admin/students/students-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminStudentsProvider,
  useAdminStudents,
} from "@/contexts/admin-students-context";

function StudentsContent() {
  const { loading, error } = useAdminStudents();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <StudentsHeader />
          <StudentsSummaryCards />
          <StudentsTable />
        </div>
      </div>
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
