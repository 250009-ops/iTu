"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { InstitutionMockSetPicker } from "@/components/admin/institution-mock-sets/institution-mock-set-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { formatMockSetSelectionSummary } from "@/lib/admin/institution-mock-set-content";
import {
  createInstitutionMockSet,
  getAdminInstitutionMockSet,
  getInstitutionMockSetContentOptions,
  updateInstitutionMockSet,
  type AdminInstitutionMockSet,
  type MockSetContentOptions,
} from "@/lib/api/admin-institution-mock-sets";
import type { MockSetPickerTab } from "@/lib/admin/institution-mock-set-content";

type Props = {
  open: boolean;
  set: AdminInstitutionMockSet | null;
  onClose: () => void;
  onSaved: () => void;
};

const EMPTY_TESTS: Record<MockSetPickerTab, Set<string>> = {
  listening: new Set(),
  reading: new Set(),
  writing: new Set(),
};

export function InstitutionMockSetEditorDialog({
  open,
  set,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTestIds, setSelectedTestIds] =
    useState<Record<MockSetPickerTab, Set<string>>>(EMPTY_TESTS);
  const [options, setOptions] = useState<MockSetContentOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentLocked, setContentLocked] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(set?.title ?? "");
    setSlug(set?.slug ?? "");
    setDescription(set?.description ?? "");
    setIsActive(set?.isActive ?? true);
    setContentLocked(set?.contentLocked ?? false);
    setSelectedPackageIds(new Set());
    setSelectedTestIds({
      listening: new Set(),
      reading: new Set(),
      writing: new Set(),
    });
  }, [open, set]);

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    void Promise.all([
      getInstitutionMockSetContentOptions(set?.id),
      set ? getAdminInstitutionMockSet(set.id) : Promise.resolve(null),
    ])
      .then(([contentOptions, detail]) => {
        setOptions(contentOptions);
        if (detail) {
          setSelectedPackageIds(new Set(detail.packageIds));
          setContentLocked(detail.contentLocked);
        }
      })
      .catch(() => {
        toast("Failed to load content options", { variant: "error" });
      })
      .finally(() => setLoadingOptions(false));
  }, [open, set, toast]);

  const listeningInPackages = options
    ? [...selectedPackageIds].filter((id) =>
        options.packages.listening.some((p) => p.id === id),
      ).length
    : 0;
  const readingInPackages = options
    ? [...selectedPackageIds].filter((id) =>
        options.packages.reading.some((p) => p.id === id),
      ).length
    : 0;
  const writingInPackages = options
    ? [...selectedPackageIds].filter((id) =>
        options.packages.writing.some((p) => p.id === id),
      ).length
    : 0;

  const selectionCount =
    selectedPackageIds.size +
    selectedTestIds.listening.size +
    selectedTestIds.reading.size +
    selectedTestIds.writing.size;

  const summary = formatMockSetSelectionSummary(
    selectedPackageIds.size,
    selectedTestIds.listening.size + listeningInPackages,
    selectedTestIds.reading.size + readingInPackages,
    selectedTestIds.writing.size + writingInPackages,
  );

  function handleChangeTests(tab: MockSetPickerTab, ids: Set<string>) {
    setSelectedTestIds((prev) => ({ ...prev, [tab]: ids }));
  }

  async function handleSave() {
    if (selectionCount === 0) {
      toast("Select at least one listening, reading, or writing mock", {
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const contentPayload = contentLocked
        ? {}
        : {
            packageIds: [...selectedPackageIds],
            listeningIds: [...selectedTestIds.listening],
            readingIds: [...selectedTestIds.reading],
            writingIds: [...selectedTestIds.writing],
          };

      if (set) {
        await updateInstitutionMockSet(set.id, {
          title,
          slug,
          description: description.trim() || null,
          isActive,
          ...contentPayload,
        });
      } else {
        await createInstitutionMockSet({
          slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
          title,
          description: description.trim() || undefined,
          isActive,
          packageIds: [...selectedPackageIds],
          listeningIds: [...selectedTestIds.listening],
          readingIds: [...selectedTestIds.reading],
          writingIds: [...selectedTestIds.writing],
        });
      }
      toast("Mock set saved", { variant: "success" });
      onSaved();
    } catch {
      toast("Save failed", { variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-4xl"
      ariaLabel={set ? "Edit institution mock set" : "New institution mock set"}
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">
            {set ? "Edit institution mock set" : "New institution mock set"}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Bundle platform section mocks for B2B centre grants. Each test can
            belong to one set only.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              {!set && (
                <div className="sm:col-span-2">
                  <Label>Slug</Label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note for admins"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onChange={setIsActive} />
                <Label>Active</Label>
              </div>
            </div>

            {contentLocked && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Content is locked because this set has been granted to at least
                one centre.
              </p>
            )}

            {loadingOptions || !options ? (
              <p className="text-sm text-muted">Loading content options…</p>
            ) : (
              <InstitutionMockSetPicker
                packages={options.packages}
                tests={options.tests}
                selectedPackageIds={selectedPackageIds}
                selectedTestIds={selectedTestIds}
                onChangePackages={setSelectedPackageIds}
                onChangeTests={handleChangeTests}
                currentSetId={set?.id}
                disabled={contentLocked}
              />
            )}
          </div>

          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-navy">Selection summary</p>
            <p className="mt-2 text-muted">{summary}</p>
            <p className="mt-4 text-xs text-muted">
              {selectionCount} item{selectionCount === 1 ? "" : "s"} selected
            </p>
          </aside>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" loading={saving} onClick={handleSave}>
          Save set
        </Button>
      </div>
    </Modal>
  );
}
