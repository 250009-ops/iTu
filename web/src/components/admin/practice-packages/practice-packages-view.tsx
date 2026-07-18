"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ApiDataShell } from "@/components/shared/api-data-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPracticePackage,
  getAdminPracticePackages,
  suggestPracticePackagePrice,
  updatePracticePackage,
  type AdminPracticePackage,
} from "@/lib/api/admin";
import { formatPrice } from "@/lib/format-price";
import { useToast } from "@/components/ui/toast";

const BUNDLE_FIELDS = [
  { key: "readingPassages", label: "Reading passages" },
  { key: "readingQuestionTypes", label: "Reading question types" },
  { key: "listeningSections", label: "Listening sections" },
  { key: "listeningQuestionTypes", label: "Listening question types" },
  { key: "aiWritingEssays", label: "AI writing essays" },
] as const;

export function PracticePackagesView() {
  const { toast } = useToast();
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
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted">
                Admin &gt; Packages &amp; Pricing &gt; Practice &amp; AI
              </p>
              <h1 className="mt-1 text-2xl font-bold text-navy">
                Practice &amp; AI Packages
              </h1>
              <p className="mt-1 text-sm text-muted">
                Sell credit bundles for practice units and AI writing reviews.
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
                  <th className="px-4 py-3">Bundle</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{pkg.title}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {Object.entries(pkg.bundle)
                        .filter(([, v]) => v > 0)
                        .map(([k, v]) => `${v} ${k}`)
                        .join(" · ") || "—"}
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
        </div>
      </div>

      {editorOpen && (
        <PracticePackageEditorDialog
          pkg={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            void refresh();
          }}
        />
      )}
    </ApiDataShell>
  );
}

function PracticePackageEditorDialog({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: AdminPracticePackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(pkg?.title ?? "");
  const [slug, setSlug] = useState(pkg?.slug ?? "");
  const [price, setPrice] = useState(pkg?.price ?? 0);
  const [isActive, setIsActive] = useState(pkg?.isActive ?? false);
  const [bundle, setBundle] = useState<Record<string, number>>(
    pkg?.bundle ?? {},
  );
  const [saving, setSaving] = useState(false);

  async function handleSuggestPrice() {
    const result = await suggestPracticePackagePrice(bundle);
    setPrice(result.suggestedPrice);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (pkg) {
        await updatePracticePackage(pkg.id, { title, price, bundle, isActive });
      } else {
        await createPracticePackage({
          slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
          title,
          price,
          bundle,
          isActive,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-navy">
          {pkg ? "Edit practice package" : "New practice package"}
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {!pkg && (
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          )}
          {BUNDLE_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                type="number"
                min={0}
                value={bundle[key] ?? 0}
                onChange={(e) =>
                  setBundle({ ...bundle, [key]: Number(e.target.value) })
                }
              />
            </div>
          ))}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Price (UZS)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => void handleSuggestPrice()}>
              Suggest
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active in student shop
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={saving} onClick={() => void handleSave()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
