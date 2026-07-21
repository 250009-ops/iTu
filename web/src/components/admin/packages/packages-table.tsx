"use client";

import { useMemo, useState } from "react";
import { Pencil, Copy, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { TypeTabBar } from "@/components/shared/type-tab-bar";
import { useToast } from "@/components/ui/toast";
import { useSessionFilter } from "@/hooks/use-session-filter";
import { useAdminPackages } from "@/contexts/admin-packages-context";
import type { AdminPackage } from "@/lib/admin/types";
import { getErrorMessage } from "@/lib/api/errors";
import {
  isPackageTypeTabId,
  VISIBLE_PACKAGE_TYPE_TABS,
  packageMatchesTypeTab,
  type PackageTypeTabId,
} from "@/lib/package-type-tabs";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";

const examTypeLabels: Record<AdminPackage["examType"], string> = {
  ACADEMIC: "Academic",
  GENERAL_TRAINING: "General Training",
};

const PACKAGE_STATUS_FILTER_KEY = "admin-packages-status-filter";
const PACKAGE_STATUS_VALUES = ["all", "active", "archived"] as const;
type PackageStatusFilter = (typeof PACKAGE_STATUS_VALUES)[number];

type PackagesTableProps = {
  typeFilter: PackageTypeTabId;
  onTypeFilterChange: (tabId: PackageTypeTabId) => void;
};

export function PackagesTable({
  typeFilter,
  onTypeFilterChange,
}: PackagesTableProps) {
  const { packages, openEditor, removePackage, duplicatePackage } = useAdminPackages();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useSessionFilter<PackageStatusFilter>(
    PACKAGE_STATUS_FILTER_KEY,
    "all",
    PACKAGE_STATUS_VALUES,
  );
  const [pendingDelete, setPendingDelete] = useState<AdminPackage | null>(null);

  const typeTabs = useMemo(
    () =>
      VISIBLE_PACKAGE_TYPE_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        count:
          tab.id === "all"
            ? packages.length
            : packages.filter((pkg) => packageMatchesTypeTab(pkg, tab.id)).length,
      })),
    [packages],
  );

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const matchesType = packageMatchesTypeTab(p, typeFilter);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? p.isActive : !p.isActive);
      const matchesQuery =
        !query.trim() ||
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.slug.toLowerCase().includes(query.toLowerCase()) ||
        (p.mockLabel?.toLowerCase().includes(query.toLowerCase()) ?? false);
      return matchesType && matchesStatus && matchesQuery;
    });
  }, [packages, query, statusFilter, typeFilter]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      const result = await removePackage(target.id);
      toast(
        result.alreadyRemoved
          ? "Package already removed"
          : result.archived
            ? "Package archived"
            : "Package deleted",
        {
        description: result.alreadyRemoved
          ? `${target.title} is no longer in the catalog — the list has been refreshed.`
          : result.archived
          ? result.releasedContent
            ? `${target.title} was hidden and its L/R/W papers were released for reuse in other packages.`
            : `${target.title} has booking history, so it was hidden instead of deleted.`
          : `${target.title} has been removed.`,
        variant: "success",
      });
    } catch (err) {
      toast("Failed to delete package", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    }
  }

  async function handleDuplicate(pkg: AdminPackage) {
    try {
      const duplicated = await duplicatePackage(pkg.id);
      openEditor(duplicated);
      toast("Package duplicated", {
        description: `${duplicated.title} was created inactive — review content and activate when ready.`,
        variant: "success",
      });
    } catch (err) {
      toast("Failed to duplicate package", {
        description: getErrorMessage(
          err,
          "Exclusive L/R/W papers may still be linked to the source package. Archive the source or use Replace mock instead.",
        ),
        variant: "warning",
      });
    }
  }

  return (
    <div className="space-y-4">
      <TypeTabBar
        tabs={typeTabs}
        activeId={typeFilter}
        onChange={(id) => {
          if (isPackageTypeTabId(id)) onTypeFilterChange(id);
        }}
      />

      <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 className="font-semibold text-navy">
          {typeFilter === "all"
            ? "All Packages"
            : `${VISIBLE_PACKAGE_TYPE_TABS.find((tab) => tab.id === typeFilter)?.label ?? "Packages"}`}
        </h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search packages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as PackageStatusFilter)
            }
            className="h-9 w-full sm:w-36"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3 sm:px-6">Package</th>
              <th className="px-5 py-3 sm:px-6">Exam Type</th>
              <th className="px-5 py-3 sm:px-6">Price</th>
              <th className="px-5 py-3 sm:px-6">Status</th>
              <th className="px-5 py-3 sm:px-6">Enrollments / Orders</th>
              <th className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted sm:px-6">
                  {typeFilter === "all"
                    ? "No packages found."
                    : `No ${VISIBLE_PACKAGE_TYPE_TABS.find((tab) => tab.id === typeFilter)?.label.toLowerCase() ?? "matching"} packages found.`}
                </td>
              </tr>
            ) : (
              filtered.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-navy">{pkg.title}</p>
                      {pkg.mockLabel && (
                        <p className="text-xs font-medium text-sky-700">{pkg.mockLabel}</p>
                      )}
                      {pkg.mostPopular && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">/{pkg.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-muted sm:px-6">
                    {examTypeLabels[pkg.examType]}
                  </td>
                  <td className="px-5 py-4 font-semibold tabular-nums text-navy sm:px-6">
                    {formatPrice(pkg.price, pkg.currency)}
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        pkg.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          pkg.isActive ? "bg-emerald-500" : "bg-slate-400",
                        )}
                      />
                      {pkg.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-5 py-4 tabular-nums text-muted sm:px-6">
                    <span>{pkg.enrollmentCount.toLocaleString()}</span>
                    {pkg.orderCount > 0 && (
                      <span className="text-xs text-slate-400">
                        {" "}
                        · {pkg.orderCount.toLocaleString()} orders
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditor(pkg)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(pkg)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 hover:text-navy"
                        aria-label={`Duplicate ${pkg.title}`}
                        title="Duplicate package"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(pkg)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-brand-red transition-colors hover:bg-rose-50"
                        aria-label={`Delete ${pkg.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete ${pendingDelete.title}?` : ""}
        message={
          pendingDelete && (pendingDelete.enrollmentCount > 0 || pendingDelete.orderCount > 0)
            ? "This package has booking history, so it will be archived (hidden from students). When no students are mid-exam, its Listening/Reading/Writing papers will be released for reuse."
            : "This package will be permanently removed. This cannot be undone."
        }
        confirmLabel={
          pendingDelete && (pendingDelete.enrollmentCount > 0 || pendingDelete.orderCount > 0)
            ? "Archive"
            : "Delete"
        }
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
    </div>
  );
}
