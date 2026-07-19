"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { PracticeContentPicker } from "@/components/admin/practice-packages/practice-content-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  deriveBundleFromSelection,
  formatBundleSummary,
} from "@/lib/admin/practice-package-content";
import {
  createPracticePackage,
  getPracticePackageContent,
  getPracticePackageContentOptions,
  suggestPracticePackagePrice,
  updatePracticePackage,
  type AdminPracticePackage,
  type PracticeContentOptionPrompt,
  type PracticeContentOptionUnit,
} from "@/lib/api/admin";
import { formatPrice } from "@/lib/format-price";
import { PRACTICE_CREDIT_META } from "@/lib/practice/hub";

type Props = {
  open: boolean;
  pkg: AdminPracticePackage | null;
  onClose: () => void;
  onSaved: () => void;
};

export function PracticePackageEditorDialog({
  open,
  pkg,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mostPopular, setMostPopular] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(
    new Set(),
  );
  const [units, setUnits] = useState<PracticeContentOptionUnit[]>([]);
  const [prompts, setPrompts] = useState<PracticeContentOptionPrompt[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  const contentLocked = pkg?.contentLocked ?? false;

  useEffect(() => {
    if (!open) return;
    setTitle(pkg?.title ?? "");
    setSlug(pkg?.slug ?? "");
    setDescription(pkg?.description ?? "");
    setPrice(pkg?.price ?? 0);
    setIsActive(pkg?.isActive ?? false);
    setMostPopular(pkg?.mostPopular ?? false);
    setSelectedUnitIds(new Set());
    setSelectedPromptIds(new Set());
  }, [open, pkg]);

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    void Promise.all([
      getPracticePackageContentOptions(pkg?.id),
      pkg ? getPracticePackageContent(pkg.id) : Promise.resolve(null),
    ])
      .then(([options, content]) => {
        setUnits(options.units);
        setPrompts(options.prompts);
        if (content) {
          setSelectedUnitIds(new Set(content.unitIds));
          setSelectedPromptIds(new Set(content.promptIds));
        }
      })
      .catch(() => {
        toast("Failed to load practice content options", { variant: "error" });
      })
      .finally(() => setLoadingOptions(false));
  }, [open, pkg, toast]);

  const derivedBundle = useMemo(
    () =>
      deriveBundleFromSelection(selectedUnitIds, selectedPromptIds, units),
    [selectedUnitIds, selectedPromptIds, units],
  );

  const summary = formatBundleSummary(derivedBundle);
  const totalSelected = selectedUnitIds.size + selectedPromptIds.size;

  async function handleSuggestPrice() {
    const result = await suggestPracticePackagePrice(derivedBundle);
    setPrice(result.suggestedPrice);
  }

  async function handleSave() {
    if (totalSelected === 0) {
      toast("Select at least one practice unit or writing prompt", {
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const basePayload = {
        title,
        description: description.trim() || undefined,
        price,
        isActive,
        mostPopular,
      };

      if (pkg) {
        await updatePracticePackage(pkg.id, {
          ...basePayload,
          ...(contentLocked
            ? {}
            : {
                unitIds: [...selectedUnitIds],
                promptIds: [...selectedPromptIds],
              }),
        });
      } else {
        await createPracticePackage({
          slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
          ...basePayload,
          unitIds: [...selectedUnitIds],
          promptIds: [...selectedPromptIds],
        });
      }
      toast("Package saved", { variant: "success" });
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
      ariaLabel={pkg ? "Edit practice package" : "New practice package"}
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-navy">
            {pkg ? "Edit practice package" : "New practice package"}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Select published practice content. Each test can belong to one
            package only.
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
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              {!pkg && (
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
                  placeholder="Short subtitle for student shop cards"
                />
              </div>
              <div>
                <Label>Price (UZS)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => void handleSuggestPrice()}
                  >
                    Suggest
                  </Button>
                </div>
              </div>
              <div className="flex flex-col justify-end gap-3 pb-1">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Active in student shop</span>
                  <Switch checked={isActive} onChange={setIsActive} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Most popular badge</span>
                  <Switch checked={mostPopular} onChange={setMostPopular} />
                </label>
              </div>
            </div>

            {contentLocked && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Content is locked because students have already purchased this
                package. You can still edit title, description, price, and
                visibility.
              </div>
            )}

            {loadingOptions ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-muted">
                Loading practice content…
              </div>
            ) : (
              <PracticeContentPicker
                units={units}
                prompts={prompts}
                selectedUnitIds={selectedUnitIds}
                selectedPromptIds={selectedPromptIds}
                onChangeUnits={setSelectedUnitIds}
                onChangePrompts={setSelectedPromptIds}
                currentPackageId={pkg?.id}
                disabled={contentLocked}
              />
            )}
          </div>

          <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-navy">Package summary</h3>
            <p className="mt-1 text-xs text-muted">
              {totalSelected} item{totalSelected === 1 ? "" : "s"} selected
            </p>
            <ul className="mt-4 space-y-2">
              {Object.entries(derivedBundle).map(([key, value]) => {
                const meta =
                  PRACTICE_CREDIT_META[
                    key as keyof typeof PRACTICE_CREDIT_META
                  ];
                if (!value) return null;
                return (
                  <li key={key} className="flex justify-between text-sm">
                    <span className="text-muted">{meta?.label ?? key}</span>
                    <span className="font-medium text-navy">{value}</span>
                  </li>
                );
              })}
            </ul>
            {summary !== "—" && (
              <p className="mt-4 text-xs leading-relaxed text-muted">{summary}</p>
            )}
            <p className="mt-4 text-lg font-bold text-navy">
              {formatPrice(price, pkg?.currency ?? "UZS")}
            </p>
          </aside>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={saving || loadingOptions}
          onClick={() => void handleSave()}
        >
          Save package
        </Button>
      </div>
    </Modal>
  );
}
