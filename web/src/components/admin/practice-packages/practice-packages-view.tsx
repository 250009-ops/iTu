"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import { PracticePackageEditorDialog } from "@/components/admin/practice-packages/practice-package-editor-dialog";
import { Button } from "@/components/ui/button";
import { getAdminPracticePackages, type AdminPracticePackage } from "@/lib/api/admin";
import { formatPrice } from "@/lib/format-price";

export function PracticePackagesView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<AdminPracticePackage[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPracticePackage | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPackages(await getAdminPracticePackages());
      setError(null);
    } catch {
      setError("Failed to load practice packages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ApiDataShell loading={loading} error={error}>
      <PortalPage>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted">
                Admin &gt; Packages &amp; Pricing &gt; Practice &amp; AI
              </p>
              <h1 className="mt-1 text-2xl font-bold text-navy">
                Practice &amp; AI Packages
              </h1>
              <p className="mt-1 text-sm text-muted">
                Build packages by selecting practice content. Counts and student
                access are derived from your selections.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New practice package
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-muted">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium">{pkg.title}</div>
                      {pkg.mostPopular && (
                        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Popular
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {pkg.contentSummary ?? "—"}
                      {pkg.contentLocked && (
                        <span className="mt-1 block text-amber-700">
                          Content locked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatPrice(pkg.price, pkg.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {pkg.isActive ? "Active" : "Inactive"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(pkg);
                          setEditorOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </PortalPage>

      <PracticePackageEditorDialog
        open={editorOpen}
        pkg={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          void refresh();
        }}
      />
    </ApiDataShell>
  );
}
