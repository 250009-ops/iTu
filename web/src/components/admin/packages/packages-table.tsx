"use client";

import { useMemo, useState } from "react";
import { Pencil, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAdminPackages } from "@/contexts/admin-packages-context";
import type { AdminPackage } from "@/lib/admin/types";
import { getErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const examTypeLabels: Record<AdminPackage["examType"], string> = {
  ACADEMIC: "Academic",
  GENERAL_TRAINING: "General Training",
};

export function PackagesTable() {
  const { packages, openEditor, removePackage } = useAdminPackages();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [pendingDelete, setPendingDelete] = useState<AdminPackage | null>(null);

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? p.isActive : !p.isActive);
      const matchesQuery =
        !query.trim() ||
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.slug.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [packages, query, statusFilter]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      const result = await removePackage(target.id);
      toast(result.archived ? "Package archived" : "Package deleted", {
        description: result.archived
          ? `${target.title} has booking history, so it was hidden instead of deleted.`
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

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 className="font-semibold text-navy">All Packages</h2>
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
              setStatusFilter(e.target.value as "all" | "active" | "archived")
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
              <th className="px-5 py-3 sm:px-6">Enrollments</th>
              <th className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted sm:px-6">
                  No packages found.
                </td>
              </tr>
            ) : (
              filtered.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-navy">{pkg.title}</p>
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
                    ${pkg.price.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted">{pkg.currency}</span>
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
                    {pkg.enrollmentCount.toLocaleString()}
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
            ? "This package has booking history, so it will be archived (hidden from students) rather than permanently deleted."
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
  );
}
