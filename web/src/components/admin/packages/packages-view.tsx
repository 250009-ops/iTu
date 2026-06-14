"use client";

import { PackageEditorDialog } from "@/components/admin/packages/package-editor-dialog";
import { PackagesHeader } from "@/components/admin/packages/packages-header";
import { PackagesSummaryCards } from "@/components/admin/packages/packages-summary-cards";
import { PackagesTable } from "@/components/admin/packages/packages-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import {
  AdminPackagesProvider,
  useAdminPackages,
} from "@/contexts/admin-packages-context";

function PackagesContent() {
  const { loading, error } = useAdminPackages();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PackagesHeader />
          <PackagesSummaryCards />
          <PackagesTable />
        </div>
      </div>
      <PackageEditorDialog />
    </ApiDataShell>
  );
}

export function PackagesView() {
  return (
    <AdminPackagesProvider>
      <PackagesContent />
    </AdminPackagesProvider>
  );
}
