"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PackageEditorDialog } from "@/components/admin/packages/package-editor-dialog";
import { PackagesHeader } from "@/components/admin/packages/packages-header";
import { PackagesSummaryCards } from "@/components/admin/packages/packages-summary-cards";
import { PackagesTable } from "@/components/admin/packages/packages-table";
import { PracticePackagesView } from "@/components/admin/practice-packages/practice-packages-view";
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
import { cn } from "@/lib/utils";

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

function PackagesViewWithTab() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "practice" ? "practice" : "mock";

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
        <div className="mx-auto flex max-w-7xl gap-2">
          <a
            href="/admin/packages"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              tab === "mock" ? "bg-navy text-white" : "text-muted hover:bg-slate-100",
            )}
          >
            Mock Packages
          </a>
          <a
            href="/admin/packages?tab=practice"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              tab === "practice"
                ? "bg-navy text-white"
                : "text-muted hover:bg-slate-100",
            )}
          >
            Practice &amp; AI Packages
          </a>
        </div>
      </div>
      {tab === "practice" ? (
        <PracticePackagesView />
      ) : (
        <AdminPackagesProvider>
          <PackagesContent />
        </AdminPackagesProvider>
      )}
    </div>
  );
}

export function PackagesView() {
  return (
    <Suspense fallback={null}>
      <PackagesViewWithTab />
    </Suspense>
  );
}
