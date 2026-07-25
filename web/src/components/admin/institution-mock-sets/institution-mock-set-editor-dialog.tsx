"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { InstitutionMockSetPicker } from "@/components/admin/institution-mock-sets/institution-mock-set-picker";
import { MockProductCard } from "@/components/student/browse/mock-product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  buildInstitutionMockSetDefaults,
  buildInstitutionMockSetProductPreview,
  emptyMockSetTestSelection,
  formatMockSetSelectionSummary,
  MOCK_SET_PICKER_TABS,
  slugifyInstitutionMockSetTitle,
  type MockSetPickerTab,
} from "@/lib/admin/institution-mock-set-content";
import {
  createInstitutionMockSet,
  getAdminInstitutionMockSet,
  getInstitutionMockSetContentOptions,
  updateInstitutionMockSet,
  type AdminInstitutionMockSet,
  type MockSetContentOptions,
} from "@/lib/api/admin-institution-mock-sets";
import type { BrowseProduct, SkillId } from "@/lib/api/mappers/student";
import { getErrorMessage } from "@/lib/api/errors";

type Props = {
  open: boolean;
  set: AdminInstitutionMockSet | null;
  onClose: () => void;
  onSaved: () => void;
};

function hydrateTestSelection(
  options: MockSetContentOptions,
  packageIds: string[],
): Record<MockSetPickerTab, Set<string>> {
  const next = emptyMockSetTestSelection();
  const packageIdSet = new Set(packageIds);
  for (const tab of MOCK_SET_PICKER_TABS) {
    for (const test of options.tests[tab] ?? []) {
      if (test.assignedPackageId && packageIdSet.has(test.assignedPackageId)) {
        next[tab].add(test.id);
      }
    }
  }
  return next;
}

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
  const [listPrice, setListPrice] = useState("");
  const [isListed, setIsListed] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTestIds, setSelectedTestIds] = useState<
    Record<MockSetPickerTab, Set<string>>
  >(emptyMockSetTestSelection);
  const [options, setOptions] = useState<MockSetContentOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grantCount, setGrantCount] = useState(0);
  /** When false, field stays synced from selection / title (create mode only). */
  const [titleManual, setTitleManual] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [descriptionManual, setDescriptionManual] = useState(false);
  const [listPriceManual, setListPriceManual] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(set?.title ?? "");
    setSlug(set?.slug ?? "");
    setDescription(set?.description ?? "");
    setListPrice(set?.listPrice != null ? String(set.listPrice) : "");
    setIsListed(set?.isListed ?? true);
    setIsActive(set?.isActive ?? true);
    setGrantCount(set?.grantCount ?? 0);
    setTitleManual(Boolean(set));
    setSlugManual(Boolean(set));
    setDescriptionManual(Boolean(set));
    setListPriceManual(Boolean(set));
    setSelectedPackageIds(new Set());
    setSelectedTestIds(emptyMockSetTestSelection());
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
          setSelectedTestIds(
            hydrateTestSelection(contentOptions, detail.packageIds),
          );
          setGrantCount(detail.grantCount);
          setListPrice(
            detail.listPrice != null ? String(detail.listPrice) : "",
          );
          setIsListed(detail.isListed ?? true);
        }
      })
      .catch(() => {
        toast("Failed to load content options", { variant: "error" });
      })
      .finally(() => setLoadingOptions(false));
  }, [open, set, toast]);

  function countInPackages(tab: MockSetPickerTab) {
    if (!options) return 0;
    return [...selectedPackageIds].filter((id) =>
      (options.packages[tab] ?? []).some((p) => p.id === id),
    ).length;
  }

  const listeningInPackages = countInPackages("listening");
  const readingInPackages = countInPackages("reading");
  const writingInPackages = countInPackages("writing");
  const speakingInPackages = countInPackages("speaking");

  const selectionCount =
    selectedPackageIds.size +
    selectedTestIds.listening.size +
    selectedTestIds.reading.size +
    selectedTestIds.writing.size +
    selectedTestIds.speaking.size;

  const listeningCount = selectedTestIds.listening.size + listeningInPackages;
  const readingCount = selectedTestIds.reading.size + readingInPackages;
  const writingCount = selectedTestIds.writing.size + writingInPackages;
  const speakingCount = selectedTestIds.speaking.size + speakingInPackages;

  const summary = formatMockSetSelectionSummary(
    listeningCount,
    readingCount,
    writingCount,
    speakingCount,
  );

  // Create mode: keep empty fields synced with the current selection.
  useEffect(() => {
    if (!open || set) return;

    const defaults = buildInstitutionMockSetDefaults({
      listening: listeningCount,
      reading: readingCount,
      writing: writingCount,
      speaking: speakingCount,
    });

    if (!titleManual) setTitle(defaults.title);
    if (!descriptionManual) setDescription(defaults.description);
    if (!listPriceManual) {
      setListPrice(defaults.listPrice > 0 ? String(defaults.listPrice) : "");
    }
  }, [
    open,
    set,
    listeningCount,
    readingCount,
    writingCount,
    speakingCount,
    titleManual,
    descriptionManual,
    listPriceManual,
  ]);

  // Slug follows title until the admin edits it (create mode only).
  useEffect(() => {
    if (!open || set || slugManual) return;
    setSlug(slugifyInstitutionMockSetTitle(title));
  }, [open, set, slugManual, title]);

  const parsedPreviewPrice = listPrice.trim() ? Number(listPrice) : 0;
  const previewListPrice = Number.isFinite(parsedPreviewPrice)
    ? parsedPreviewPrice
    : 0;

  function sectionDetail(tab: MockSetPickerTab): string | undefined {
    if (!options) return undefined;
    const selectedPackage = (options.packages[tab] ?? []).find((pkg) =>
      selectedPackageIds.has(pkg.id),
    );
    if (selectedPackage) return selectedPackage.title;
    const selectedTest = (options.tests[tab] ?? []).find((test) =>
      selectedTestIds[tab].has(test.id),
    );
    return selectedTest?.title;
  }

  const previewProduct: BrowseProduct = (() => {
    const product = buildInstitutionMockSetProductPreview({
      title,
      description,
      listPrice: previewListPrice,
      sectionCounts: {
        listening: listeningCount,
        reading: readingCount,
        writing: writingCount,
        speaking: speakingCount,
      },
      sectionDetails: {
        listening: sectionDetail("listening"),
        reading: sectionDetail("reading"),
        writing: sectionDetail("writing"),
        speaking: sectionDetail("speaking"),
      },
    });
    const skillIds = product.skills.map(
      (skill) => skill.id as BrowseProduct["skillIds"][number],
    );
    return {
      ...product,
      rating: 0,
      skillIds,
      needsWriting: skillIds.includes("writing"),
      needsSpeaking: skillIds.includes("speaking"),
      skills: product.skills.map((skill) => ({
        ...skill,
        id: skill.id as SkillId,
      })),
    };
  })();

  function handleChangeTests(tab: MockSetPickerTab, ids: Set<string>) {
    setSelectedTestIds((prev) => ({ ...prev, [tab]: ids }));
  }

  async function handleSave() {
    if (selectionCount === 0) {
      toast("Select at least one listening, reading, writing, or speaking mock", {
        variant: "warning",
      });
      return;
    }

    const parsedListPrice = listPrice.trim() ? Number(listPrice) : 0;
    if (isListed && (!Number.isFinite(parsedListPrice) || parsedListPrice <= 0)) {
      toast("Enter a list price greater than zero when listed for sale", {
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const pricingPayload = {
        listPrice: parsedListPrice,
        isListed,
      };
      const contentPayload = {
        packageIds: [...selectedPackageIds],
        listeningIds: [...selectedTestIds.listening],
        readingIds: [...selectedTestIds.reading],
        writingIds: [...selectedTestIds.writing],
        speakingIds: [...selectedTestIds.speaking],
      };

      if (set) {
        await updateInstitutionMockSet(set.id, {
          title,
          slug,
          description: description.trim() || null,
          isActive,
          ...pricingPayload,
          ...contentPayload,
        });
      } else {
        await createInstitutionMockSet({
          slug: slug || slugifyInstitutionMockSetTitle(title),
          title,
          description: description.trim() || undefined,
          isActive,
          ...pricingPayload,
          ...contentPayload,
        });
      }
      toast("Mock set saved", {
        description:
          grantCount > 0
            ? "Granted centres will see the updated content immediately."
            : undefined,
        variant: "success",
      });
      onSaved();
    } catch (err) {
      toast("Save failed", {
        description: getErrorMessage(err, "Save failed"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-5xl"
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
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitleManual(true);
                    setTitle(e.target.value);
                  }}
                  placeholder="Filled from selection"
                />
              </div>
              {!set && (
                <div className="sm:col-span-2">
                  <Label>Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlugManual(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="Filled from title"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => {
                    setDescriptionManual(true);
                    setDescription(e.target.value);
                  }}
                  placeholder="Filled from selection"
                />
              </div>
              <div>
                <Label>List price (UZS)</Label>
                <Input
                  type="number"
                  min={0}
                  value={listPrice}
                  onChange={(e) => {
                    setListPriceManual(true);
                    setListPrice(e.target.value);
                  }}
                  placeholder="Suggested from catalog prices"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isListed} onChange={setIsListed} />
                <Label>Listed for sale</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onChange={setIsActive} />
                <Label>Active</Label>
              </div>
            </div>

            {grantCount > 0 && (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                This set is granted to {grantCount} centre
                {grantCount === 1 ? "" : "s"}. Content edits apply to those
                centres immediately. You cannot remove a mock that still has
                active student enrolments.
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
              />
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-navy">Selection summary</p>
              <p className="mt-2 text-muted">{summary}</p>
              <p className="mt-4 text-xs text-muted">
                {selectionCount} item{selectionCount === 1 ? "" : "s"} selected
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-8 space-y-3 border-t border-slate-200 pt-6">
          <div>
            <h3 className="text-sm font-semibold text-navy">Shop card preview</h3>
            <p className="mt-1 text-xs text-muted">
              Counts start at 0 and update as you select mocks — this matches what
              centres see when the set is listed.
            </p>
          </div>
          <MockProductCard
            mode="institutionShop"
            product={previewProduct}
            purchaseDisabled
            purchaseDisabledReason="Preview only — save and list the set to sell it"
          />
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
