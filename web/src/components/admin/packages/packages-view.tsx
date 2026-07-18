"use client";

import { PackageEditorDialog } from "@/components/admin/packages/package-editor-dialog";
import { PackagesHeader } from "@/components/admin/packages/packages-header";
import { PackagesSummaryCards } from "@/components/admin/packages/packages-summary-cards";
import { PackagesTable } from "@/components/admin/packages/packages-table";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { useSessionFilter } from "@/hooks/use-session-filter";
import {
  AdminPackagesProvider,
  useAdminPackages,
} from "@/contexts/admin-packages-context";
import {
  isPackageTypeTabId,
  VISIBLE_PACKAGE_TYPE_TABS,
  type PackageTypeTabId,
} from "@/lib/package-type-tabs";

const PACKAGE_TYPE_FILTER_KEY = "admin-packages-type-filter";
const PACKAGE_TYPE_VALUES = VISIBLE_PACKAGE_TYPE_TABS.map((tab) => tab.id);

function PackagesContent() {
  const { loading, error } = useAdminPackages();
  const [typeFilter, setTypeFilter] = useSessionFilter<PackageTypeTabId>(
    PACKAGE_TYPE_FILTER_KEY,
    "all",
    PACKAGE_TYPE_VALUES.filter(isPackageTypeTabId),
  );

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PackagesHeader typeFilter={typeFilter} />
          <PackagesSummaryCards />
          <PackagesTable
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />
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
