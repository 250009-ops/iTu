"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import {
  activateInstitutionPackage,
  createInstitutionPackage,
  getInstitutionPackageContentTests,
  getInstitutionPackageNextIdentity,
  getInstitutionPackagesMine,
  updateInstitutionPackageLinks,
} from "@/lib/api/institution-content";

type PackageRow = Awaited<ReturnType<typeof getInstitutionPackagesMine>>[number];
type ContentTestOption = Awaited<
  ReturnType<typeof getInstitutionPackageContentTests>
>[number];

const SKILL_FIELDS = [
  { key: "listeningTestId" as const, label: "Listening", type: "LISTENING" },
  { key: "readingTestId" as const, label: "Reading", type: "READING" },
  { key: "writingTestId" as const, label: "Writing", type: "WRITING" },
  { key: "speakingBankId" as const, label: "Speaking bank", type: "SPEAKING" },
];

export function InstitutionPackagesPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [testsByType, setTestsByType] = useState<Record<string, ContentTestOption[]>>(
    {},
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [suggestedMockLabel, setSuggestedMockLabel] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [draftLinks, setDraftLinks] = useState<
    Record<string, Partial<Record<(typeof SKILL_FIELDS)[number]["key"], string>>>
  >({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, listening, reading, writing, speaking] = await Promise.all([
        getInstitutionPackagesMine(),
        getInstitutionPackageContentTests("LISTENING"),
        getInstitutionPackageContentTests("READING"),
        getInstitutionPackageContentTests("WRITING"),
        getInstitutionPackageContentTests("SPEAKING"),
      ]);
      setPackages(mine);
      setTestsByType({
        LISTENING: listening,
        READING: reading,
        WRITING: writing,
        SPEAKING: speaking,
      });
      setDraftLinks(
        Object.fromEntries(
          mine.map((pkg) => [
            pkg.id,
            {
              listeningTestId: pkg.listeningTestId ?? "",
              readingTestId: pkg.readingTestId ?? "",
              writingTestId: pkg.writingTestId ?? "",
              speakingBankId: pkg.speakingBankId ?? "",
            },
          ]),
        ),
      );
    } catch (err) {
      toast("Could not load packages", {
        description: getErrorMessage(err, "Please refresh the page."),
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!createOpen) return;
    setLoadingSuggestion(true);
    void getInstitutionPackageNextIdentity()
      .then((next) => {
        setNewTitle(next.title);
        setSuggestedMockLabel(next.mockLabel);
      })
      .catch(() => {
        setSuggestedMockLabel(null);
      })
      .finally(() => setLoadingSuggestion(false));
  }, [createOpen]);

  async function handleCreate() {
    if (!newTitle.trim()) {
      toast("Title required", { variant: "warning" });
      return;
    }
    setCreating(true);
    try {
      await createInstitutionPackage({ title: newTitle.trim() });
      setNewTitle("");
      setCreateOpen(false);
      await refresh();
      toast("Package created", {
        description: "Link published tests, then activate when ready.",
        variant: "success",
      });
    } catch (err) {
      toast("Create failed", {
        description: getErrorMessage(err, "Could not create package."),
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveLinks(pkg: PackageRow) {
    const links = draftLinks[pkg.id] ?? {};
    setSavingId(pkg.id);
    try {
      await updateInstitutionPackageLinks(pkg.id, {
        listeningTestId: links.listeningTestId || null,
        readingTestId: links.readingTestId || null,
        writingTestId: links.writingTestId || null,
        speakingBankId: links.speakingBankId || null,
      });
      await refresh();
      toast("Links saved", { variant: "success" });
    } catch (err) {
      toast("Save failed", {
        description: getErrorMessage(err, "Check all skills have a published test."),
        variant: "error",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function handleActivate(pkg: PackageRow) {
    setActivatingId(pkg.id);
    try {
      await activateInstitutionPackage(pkg.id);
      await refresh();
      toast("Package activated", {
        description: `${pkg.title} is now available in the Enroll wizard.`,
        variant: "success",
      });
    } catch (err) {
      toast("Activation failed", {
        description: getErrorMessage(err, "Assign all skills before activating."),
        variant: "error",
      });
    } finally {
      setActivatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading packages…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6 xl:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy">Private mock packages</h2>
          <p className="mt-1 text-sm text-muted">
            Build centre-only packages from your published tests. These appear alongside
            granted platform mocks in the Enroll wizard.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New package
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-slate-50 px-6 py-12 text-center text-sm text-muted">
          No private packages yet. Create one, link your published tests, then activate
          it for enrollment.
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => {
            const links = draftLinks[pkg.id] ?? {};
            return (
              <div
                key={pkg.id}
                className="rounded-xl border border-border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {pkg.mockLabel}
                    </p>
                    <h3 className="text-lg font-bold text-navy">{pkg.title}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {pkg.isActive ? "Active — free enrollment" : "Draft — activate when ready"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={savingId === pkg.id}
                      onClick={() => void handleSaveLinks(pkg)}
                    >
                      Save links
                    </Button>
                    {!pkg.isActive && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={activatingId === pkg.id}
                        onClick={() => void handleActivate(pkg)}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {SKILL_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label>{field.label}</Label>
                      <select
                        value={links[field.key] ?? ""}
                        onChange={(e) =>
                          setDraftLinks((prev) => ({
                            ...prev,
                            [pkg.id]: {
                              ...prev[pkg.id],
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
                      >
                        <option value="">Select published test…</option>
                        {(testsByType[field.type] ?? []).map((test) => (
                          <option key={test.id} value={test.id}>
                            {test.code} — {test.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-navy">New private package</h3>
            <p className="mt-1 text-sm text-muted">
              Full mock (L/R/W/S). You can link tests after creation.
            </p>
            {suggestedMockLabel && (
              <p className="mt-2 text-xs font-medium text-navy">
                Package ID: {suggestedMockLabel}
              </p>
            )}
            <div className="mt-4 space-y-2">
              <Label htmlFor="pkg-title">Title</Label>
              <Input
                id="pkg-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={loadingSuggestion ? "Loading suggested title…" : "Full Academic Mock-A001"}
                disabled={loadingSuggestion}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={creating}
                onClick={() => void handleCreate()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
