"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useAdminPackages } from "@/contexts/admin-packages-context";
import type {
  AdminContentTestOption,
  ContentTestType,
  ExamTypeValue,
} from "@/lib/admin/types";
import { getErrorMessage } from "@/lib/api/errors";

type FormState = {
  title: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  examType: ExamTypeValue;
  mostPopular: boolean;
  isActive: boolean;
  rating: string;
  reviewCount: string;
  included: string;
  rules: string;
  listeningTestId: string;
  readingTestId: string;
  writingTestId: string;
  speakingBankId: string;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  description: "",
  price: "",
  currency: "USD",
  examType: "ACADEMIC",
  mostPopular: false,
  isActive: true,
  rating: "",
  reviewCount: "",
  included: "",
  rules: "",
  listeningTestId: "",
  readingTestId: "",
  writingTestId: "",
  speakingBankId: "",
};

const labelCls = "text-xs font-semibold text-navy";
const textareaCls =
  "flex w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/20 focus-visible:border-navy min-h-[6rem]";

function isPublishedStatus(status: string) {
  return status.toLowerCase().replace(/-/g, "_") === "published";
}

function TestSelect({
  label,
  type,
  value,
  options,
  onChange,
}: {
  label: string;
  type: ContentTestType;
  value: string;
  options: AdminContentTestOption[];
  onChange: (v: string) => void;
}) {
  const filtered = options.filter((o) => o.type === type);
  const selectable = filtered.filter(
    (o) => isPublishedStatus(o.status) || o.id === value,
  );
  const selected = filtered.find((o) => o.id === value);

  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full"
      >
        <option value="">Not linked</option>
        {selectable.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code} · {o.title}
            {!isPublishedStatus(o.status) ? " (draft)" : ""}
          </option>
        ))}
      </Select>
      {selected && (
        <p className="text-xs text-muted">
          {selected.code} · {selected.title}
          {!isPublishedStatus(selected.status) ? " · draft (legacy link)" : ""}
        </p>
      )}
    </div>
  );
}

export function PackageEditorDialog() {
  const { editor, closeEditor, savePackage, contentTests } = useAdminPackages();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const pkg = editor.pkg;
  const isEdit = pkg !== null;

  useEffect(() => {
    if (!editor.open) return;
    if (pkg) {
      setForm({
        title: pkg.title,
        slug: pkg.slug,
        description: pkg.description ?? "",
        price: String(pkg.price),
        currency: pkg.currency,
        examType: pkg.examType,
        mostPopular: pkg.mostPopular,
        isActive: pkg.isActive,
        rating: pkg.rating != null ? String(pkg.rating) : "",
        reviewCount: String(pkg.reviewCount ?? 0),
        included: (pkg.included ?? []).join("\n"),
        rules: (pkg.rules ?? []).join("\n"),
        listeningTestId: pkg.listeningTestId ?? "",
        readingTestId: pkg.readingTestId ?? "",
        writingTestId: pkg.writingTestId ?? "",
        speakingBankId: pkg.speakingBankId ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editor.open, pkg]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const priceValue = useMemo(() => Number(form.price), [form.price]);
  const ratingValue = useMemo(
    () => (form.rating.trim() === "" ? null : Number(form.rating)),
    [form.rating],
  );
  const reviewCountValue = useMemo(
    () => Number(form.reviewCount || "0"),
    [form.reviewCount],
  );

  const priceInvalid = form.price.trim() === "" || Number.isNaN(priceValue) || priceValue < 0;
  const titleInvalid = form.title.trim() === "";
  const ratingInvalid =
    form.rating.trim() !== "" &&
    (Number.isNaN(ratingValue) || ratingValue! < 0 || ratingValue! > 5);
  const reviewCountInvalid =
    form.reviewCount.trim() !== "" &&
    (Number.isNaN(reviewCountValue) || reviewCountValue < 0);

  const previewSlug = form.slug.trim() || pkg?.slug;
  const siteHref = previewSlug
    ? `/mock-exams?package=${encodeURIComponent(previewSlug)}`
    : "/mock-exams";

  if (!editor.open) return null;

  async function handleSave() {
    if (titleInvalid || priceInvalid || ratingInvalid || reviewCountInvalid) {
      toast("Check the form", {
        description: "Fix required fields and numeric ranges before saving.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      await savePackage(pkg?.id ?? null, {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || null,
        price: priceValue,
        currency: form.currency,
        examType: form.examType,
        mostPopular: form.mostPopular,
        isActive: form.isActive,
        rating: ratingValue,
        reviewCount: reviewCountValue,
        included: form.included
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        rules: form.rules
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        listeningTestId: form.listeningTestId || null,
        readingTestId: form.readingTestId || null,
        writingTestId: form.writingTestId || null,
        speakingBankId: form.speakingBankId || null,
      });
      toast(isEdit ? "Package updated" : "Package created", {
        description: `${form.title.trim()} · $${priceValue} ${form.currency}`,
        variant: "success",
      });
      closeEditor();
    } catch (err) {
      toast("Failed to save package", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={closeEditor}
    >
      <div
        className="flex max-h-[min(90vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">
              {isEdit ? "Edit Package" : "New Package"}
            </h2>
            <p className="text-sm text-muted">
              {isEdit ? pkg?.title : "Define a new mock exam product."}
            </p>
          </div>
          <button
            type="button"
            onClick={closeEditor}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <label className={labelCls}>Title</label>
            <Input
              value={form.title}
              error={titleInvalid}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Full Academic Mock"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className={labelCls}>Slug (optional)</label>
              {previewSlug && (
                <Link
                  href={siteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
                >
                  View on site
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="auto-generated from title"
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={textareaCls}
              placeholder="All four skills in one day, graded by certified examiners."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Price</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={form.price}
                  error={priceInvalid}
                  onChange={(e) => set("price", e.target.value)}
                  className="pl-7"
                  placeholder="49"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Currency</label>
              <Select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="h-10 w-full"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="AUD">AUD</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Exam type</label>
              <Select
                value={form.examType}
                onChange={(e) => set("examType", e.target.value as ExamTypeValue)}
                className="h-10 w-full"
              >
                <option value="ACADEMIC">Academic</option>
                <option value="GENERAL_TRAINING">General Training</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelCls}>Rating (0–5, optional)</label>
              <Input
                type="number"
                min={0}
                max={5}
                step="0.1"
                value={form.rating}
                error={ratingInvalid}
                onChange={(e) => set("rating", e.target.value)}
                placeholder="4.8"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Review count</label>
              <Input
                type="number"
                min={0}
                step="1"
                value={form.reviewCount}
                error={reviewCountInvalid}
                onChange={(e) => set("reviewCount", e.target.value)}
                placeholder="120"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-navy">Most popular</p>
                <p className="text-xs text-muted">Only one package can be highlighted.</p>
              </div>
              <Switch
                checked={form.mostPopular}
                onChange={(v) => set("mostPopular", v)}
                aria-label="Most popular"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-navy">Active</p>
                <p className="text-xs text-muted">Visible &amp; bookable.</p>
              </div>
              <Switch
                checked={form.isActive}
                onChange={(v) => set("isActive", v)}
                aria-label="Active"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelCls}>What&apos;s included (one per line)</label>
              <textarea
                value={form.included}
                onChange={(e) => set("included", e.target.value)}
                rows={5}
                className={textareaCls}
                placeholder={"Pick your examiner\nSame-day band results"}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Exam rules (one per line)</label>
              <textarea
                value={form.rules}
                onChange={(e) => set("rules", e.target.value)}
                rows={5}
                className={textareaCls}
                placeholder={"No pause or rewind\nServer-authoritative timers"}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-slate-50 p-4 pb-5">
            <div>
              <p className="text-sm font-semibold text-navy">Linked exam content</p>
              <p className="text-xs text-muted">
                Only published tests appear in the picker. Existing draft links stay until you change them.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <TestSelect
                label="Listening test"
                type="LISTENING"
                value={form.listeningTestId}
                options={contentTests}
                onChange={(v) => set("listeningTestId", v)}
              />
              <TestSelect
                label="Reading test"
                type="READING"
                value={form.readingTestId}
                options={contentTests}
                onChange={(v) => set("readingTestId", v)}
              />
              <TestSelect
                label="Writing test"
                type="WRITING"
                value={form.writingTestId}
                options={contentTests}
                onChange={(v) => set("writingTestId", v)}
              />
              <TestSelect
                label="Speaking bank"
                type="SPEAKING"
                value={form.speakingBankId}
                options={contentTests}
                onChange={(v) => set("speakingBankId", v)}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="secondary" size="sm" onClick={closeEditor} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            {isEdit ? "Save Changes" : "Create Package"}
          </Button>
        </div>
      </div>
    </div>
  );
}
