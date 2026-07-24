"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { EnrollWizard } from "@/components/institution/enroll-wizard";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { PortalPage } from "@/components/portal/portal-page";
import { PackageTestSelect } from "@/components/packages/shared/package-test-select";
import { TypeTabBar } from "@/components/shared/type-tab-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import {
  activateInstitutionPackage,
  createInstitutionPackage,
  getInstitutionPackageContentTests,
  getInstitutionPackageNextIdentity,
  getInstitutionPackagesMine,
  updateInstitutionPackageLinks,
  type InstitutionMockContentTest,
} from "@/lib/api/institution-content";
import { getInstitutionStudents } from "@/lib/api/institution";
import {
  examTypeForPackageTypeTab,
  labelForPackageTypeTab,
  packageMatchesTypeTab,
  skillsForPackageTypeTab,
  STUDENT_BROWSE_TYPE_TABS,
  VISIBLE_PACKAGE_TYPE_TABS,
  type PackageTypeTabId,
} from "@/lib/package-type-tabs";
import { PageHeader } from "@/components/institution/ui";
import { cn } from "@/lib/utils";

type PackageRow = Awaited<ReturnType<typeof getInstitutionPackagesMine>>[number];

const SKILL_FIELDS = [
  { key: "listeningTestId" as const, label: "Listening", type: "LISTENING" },
  { key: "readingTestId" as const, label: "Reading", type: "READING" },
  { key: "writingTestId" as const, label: "Writing", type: "WRITING" },
  { key: "speakingBankId" as const, label: "Speaking bank", type: "SPEAKING" },
];

const FIELD_SKILL: Record<(typeof SKILL_FIELDS)[number]["key"], string> = {
  listeningTestId: "listening",
  readingTestId: "reading",
  writingTestId: "writing",
  speakingBankId: "speaking",
};

function packageSkillIds(pkg: PackageRow): string[] {
  if (Array.isArray(pkg.skills)) {
    return pkg.skills.map((skill) => String(skill).toLowerCase());
  }
  return ["listening", "reading", "writing", "speaking"];
}

function fieldsForPackage(pkg: PackageRow) {
  const skills = new Set(packageSkillIds(pkg));
  return SKILL_FIELDS.filter((field) => skills.has(FIELD_SKILL[field.key]));
}

export function InstitutionMocksView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [contentTests, setContentTests] = useState<InstitutionMockContentTest[]>(
    [],
  );
  const [typeFilter, setTypeFilter] = useState<PackageTypeTabId>("all");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTypeTab, setCreateTypeTab] =
    useState<PackageTypeTabId>("full-academic");
  const [newTitle, setNewTitle] = useState("");
  const [suggestedMockLabel, setSuggestedMockLabel] = useState<string | null>(
    null,
  );
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editPkg, setEditPkg] = useState<PackageRow | null>(null);
  const [draftLinks, setDraftLinks] = useState<
    Partial<Record<(typeof SKILL_FIELDS)[number]["key"], string>>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [pickStudentFor, setPickStudentFor] = useState<PackageRow | null>(null);
  const [students, setStudents] = useState<
    { id: string; name: string; status: string }[]
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollStudentName, setEnrollStudentName] = useState("");
  const [enrollPackageId, setEnrollPackageId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, tests] = await Promise.all([
        getInstitutionPackagesMine(),
        getInstitutionPackageContentTests(),
      ]);
      setPackages(mine);
      setContentTests(tests);
      setError(null);
    } catch {
      setError("Failed to load mocks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!createOpen) return;
    const tab = STUDENT_BROWSE_TYPE_TABS.find((item) => item.id === createTypeTab);
    setLoadingSuggestion(true);
    void getInstitutionPackageNextIdentity({
      packageKind: tab?.packageKind,
      examType: tab?.examType,
      skills: skillsForPackageTypeTab(createTypeTab),
    })
      .then((next) => {
        setNewTitle(next.title);
        setSuggestedMockLabel(next.mockLabel);
      })
      .catch(() => setSuggestedMockLabel(null))
      .finally(() => setLoadingSuggestion(false));
  }, [createOpen, createTypeTab]);

  const typeTabs = useMemo(() => {
    return VISIBLE_PACKAGE_TYPE_TABS.map((tab) => ({
      id: tab.id,
      label: tab.label,
      muted:
        tab.id !== "all" &&
        !packages.some((pkg) => packageMatchesTypeTab(pkg, tab.id)),
    }));
  }, [packages]);

  const filtered = useMemo(() => {
    return packages.filter((pkg) => {
      if (!packageMatchesTypeTab(pkg, typeFilter)) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        pkg.title.toLowerCase().includes(q) ||
        pkg.mockLabel.toLowerCase().includes(q) ||
        pkg.packageKindLabel.toLowerCase().includes(q)
      );
    });
  }, [packages, typeFilter, query]);

  async function handleCreate() {
    if (!newTitle.trim()) {
      toast("Title required", { variant: "warning" });
      return;
    }
    setCreating(true);
    try {
      const created = await createInstitutionPackage({
        title: newTitle.trim(),
        skills: skillsForPackageTypeTab(createTypeTab),
        examType: examTypeForPackageTypeTab(createTypeTab),
      });
      setCreateOpen(false);
      setCreateTypeTab("full-academic");
      await refresh();
      setEditPkg(created);
      setDraftLinks({
        listeningTestId: created.listeningTestId ?? "",
        readingTestId: created.readingTestId ?? "",
        writingTestId: created.writingTestId ?? "",
        speakingBankId: created.speakingBankId ?? "",
      });
      toast("Mock created", {
        description: "Link published tests, then activate when ready.",
        variant: "success",
      });
    } catch (err) {
      toast("Create failed", {
        description: getErrorMessage(err, "Could not create mock."),
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  function openEditor(pkg: PackageRow) {
    setEditPkg(pkg);
    setDraftLinks({
      listeningTestId: pkg.listeningTestId ?? "",
      readingTestId: pkg.readingTestId ?? "",
      writingTestId: pkg.writingTestId ?? "",
      speakingBankId: pkg.speakingBankId ?? "",
    });
  }

  async function handleSaveLinks() {
    if (!editPkg) return;
    setSavingId(editPkg.id);
    try {
      await updateInstitutionPackageLinks(editPkg.id, {
        listeningTestId: draftLinks.listeningTestId || null,
        readingTestId: draftLinks.readingTestId || null,
        writingTestId: draftLinks.writingTestId || null,
        speakingBankId: draftLinks.speakingBankId || null,
      });
      await refresh();
      toast("Links saved", { variant: "success" });
      setEditPkg(null);
    } catch (err) {
      toast("Save failed", {
        description: getErrorMessage(
          err,
          "Check all skills have a published test that is not already used.",
        ),
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
      toast("Mock activated", {
        description: `${pkg.title} is ready for student enrollment.`,
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

  async function openStudentPicker(pkg: PackageRow) {
    if (!pkg.isActive) {
      toast("Activate this mock first", { variant: "warning" });
      return;
    }
    setPickStudentFor(pkg);
    setSelectedStudentId("");
    try {
      const data = await getInstitutionStudents("active");
      setStudents(
        data.students.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
        })),
      );
    } catch {
      setStudents([]);
    }
  }

  function startEnroll() {
    if (!pickStudentFor || !selectedStudentId) return;
    const student = students.find((s) => s.id === selectedStudentId);
    setEnrollPackageId(pickStudentFor.id);
    setEnrollStudentId(selectedStudentId);
    setEnrollStudentName(student?.name ?? "student");
    setPickStudentFor(null);
    setEnrollOpen(true);
  }

  return (
    <PortalPage innerClassName="space-y-8">
      <PageHeader
        breadcrumb="Institution"
        title="Mocks"
        description="Assemble enrollable mocks from purchased tests and Content Studio tests. Students enroll in mocks created here — not raw tests."
        actions={
          <>
            <Link href="/institution/tests/purchased">
              <Button variant="secondary" size="sm">
                Tests
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCreateTypeTab(
                  typeFilter === "all" ? "full-academic" : typeFilter,
                );
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New mock
            </Button>
          </>
        }
      />

      <ApiDataShell loading={loading} error={error}>
        <div className="space-y-4">
          <TypeTabBar
            tabs={typeTabs}
            activeId={typeFilter}
            onChange={(id) => setTypeFilter(id as PackageTypeTabId)}
          />

          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search mocks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-slate-50 px-6 py-12 text-center text-sm text-muted">
              No mocks yet. Create a full or section mock, link published tests from
              your Purchased set or Content Studio, then activate it for enrollment.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-5 py-3">Mock ID</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-mono text-xs text-muted">
                        {pkg.mockLabel}
                      </td>
                      <td className="px-5 py-3 font-semibold text-navy">
                        {pkg.title}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {pkg.packageKindLabel}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            pkg.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {pkg.isActive ? "Active" : "Draft"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditor(pkg)}
                          >
                            Edit
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
                          {pkg.isActive && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => void openStudentPicker(pkg)}
                            >
                              Enroll
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ApiDataShell>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-navy">New mock</h3>
            <p className="mt-1 text-sm text-muted">
              Choose a mock type like the platform catalogue — full academic or
              section-only. Link tests after creation.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STUDENT_BROWSE_TYPE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCreateTypeTab(tab.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    createTypeTab === tab.id
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-muted hover:bg-slate-200 hover:text-navy",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {suggestedMockLabel && (
              <p className="mt-3 text-xs font-medium text-navy">
                Mock ID: {suggestedMockLabel} ·{" "}
                {labelForPackageTypeTab(createTypeTab)}
              </p>
            )}
            <div className="mt-4 space-y-2">
              <Label htmlFor="mock-title">Title</Label>
              <Input
                id="mock-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={loadingSuggestion}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreateOpen(false)}
              >
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

      <Modal
        open={editPkg != null}
        onClose={() => setEditPkg(null)}
        ariaLabel="Edit mock links"
        className="max-w-lg"
      >
        {editPkg && (
          <>
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-bold text-navy">{editPkg.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {editPkg.mockLabel} · {editPkg.packageKindLabel}. Link published
                tests from your Purchased set or Content Studio.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {fieldsForPackage(editPkg).map((field) => (
                <PackageTestSelect
                  key={field.key}
                  label={field.label}
                  type={field.type}
                  value={draftLinks[field.key] ?? ""}
                  options={contentTests}
                  currentPackageId={editPkg.id}
                  onChange={(v) =>
                    setDraftLinks((prev) => ({ ...prev, [field.key]: v }))
                  }
                />
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditPkg(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={savingId === editPkg.id}
                onClick={() => void handleSaveLinks()}
              >
                Save links
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={pickStudentFor != null}
        onClose={() => setPickStudentFor(null)}
        ariaLabel="Select student to enroll"
        className="max-w-md"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-navy">Enroll a student</h2>
          <p className="mt-1 text-sm text-muted">
            Choose an active student for {pickStudentFor?.title ?? "this mock"}
          </p>
        </div>
        <div className="space-y-4 p-5">
          {students.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading students…
            </p>
          ) : (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
            >
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPickStudentFor(null)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedStudentId}
            onClick={startEnroll}
          >
            Continue
          </Button>
        </div>
      </Modal>

      <EnrollWizard
        open={enrollOpen}
        studentId={enrollStudentId}
        studentName={enrollStudentName}
        initialPackageId={enrollPackageId}
        onClose={() => setEnrollOpen(false)}
        onEnrolled={() => setEnrollOpen(false)}
      />
    </PortalPage>
  );
}
