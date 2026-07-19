"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AdminPackagesSectionTabs } from "@/components/admin/admin-section-tabs";
import { InstitutionMockSetEditorDialog } from "@/components/admin/institution-mock-sets/institution-mock-set-editor-dialog";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import {
  getAdminInstitutionMockSets,
  type AdminInstitutionMockSet,
} from "@/lib/api/admin-institution-mock-sets";

export function InstitutionMockSetsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState<AdminInstitutionMockSet[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminInstitutionMockSet | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSets(await getAdminInstitutionMockSets());
      setError(null);
    } catch {
      setError("Failed to load institution mock sets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <AdminPackagesSectionTabs active="institution-sets" />
      <ApiDataShell loading={loading} error={error}>
        <div className="p-4 lg:p-6 xl:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted">
                  Admin &gt; Packages &amp; Pricing &gt; Institution Mock Sets
                </p>
                <h1 className="mt-1 text-2xl font-bold text-navy">
                  Institution Mock Sets
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Create B2B bundles of platform section mocks and grant them to
                  education centres.
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
                New set
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-muted">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Contents</th>
                    <th className="px-4 py-3">Grants</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sets.map((set) => (
                    <tr key={set.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium">{set.title}</div>
                        <div className="text-xs text-muted">{set.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {set.contentSummary}
                      </td>
                      <td className="px-4 py-3">{set.grantCount}</td>
                      <td className="px-4 py-3">
                        {set.isActive ? (
                          <span className="text-emerald-700">Yes</span>
                        ) : (
                          <span className="text-muted">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditing(set);
                            setEditorOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sets.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-muted"
                      >
                        No institution mock sets yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <InstitutionMockSetEditorDialog
          open={editorOpen}
          set={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            void refresh();
          }}
        />
      </ApiDataShell>
    </>
  );
}
