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
import { getNextMockNumber } from "@/lib/api/admin";

type SkillId = "listening" | "reading" | "writing" | "speaking";

type FormState = {
  title: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  examType: ExamTypeValue;
  skills: SkillId[];
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

const PACKAGE_SKILL_PRESETS: { id: string; label: string; skills: SkillId[] }[] = [
  {
    id: "full",
    label: "Full mock (L + R + W + S)",
    skills: ["listening", "reading", "writing", "speaking"],
  },
  { id: "speaking", label: "Speaking only", skills: ["speaking"] },
  { id: "writing", label: "Writing only", skills: ["writing"] },
  { id: "listening", label: "Listening only", skills: ["listening"] },
  { id: "reading", label: "Reading only", skills: ["reading"] },
];

const emptyForm: FormState = {
  title: "",
  slug: "",
  description: "",
  price: "",
  currency: "USD",
  examType: "ACADEMIC",
  skills: ["listening", "reading", "writing", "speaking"],
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

function isLinkableForPackage(status: string) {
  return status.toLowerCase().replace(/-/g, "_") === "published";
}

function normalizeSkills(raw: unknown): SkillId[] {
  if (!Array.isArray(raw)) {
    return ["listening", "reading", "writing", "speaking"];
  }
  const allowed = new Set<SkillId>(["listening", "reading", "writing", "speaking"]);
  return raw
    .map((entry) => String(entry).toLowerCase() as SkillId)
    .filter((skill) => allowed.has(skill));
}

function TestSelect({
  label,
  type,
  value,
  options,
  currentPackageId,
  disabled = false,
  onChange,
}: {
  label: string;
  type: ContentTestType;
  value: string;
  options: AdminContentTestOption[];
  currentPackageId?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  // Speaking banks are reusable topic pools, so they may be shared across
  // packages. Listening/Reading/Writing papers stay exclusive to one package.
  const reusable = type === "SPEAKING";
  const filtered = options.filter((o) => o.type === type);
  const selectable = filtered.filter((o) => {
    if (o.id === value) return true;
    if (!isLinkableForPackage(o.status)) return false;
    if (reusable) return true;
    if (!o.isPackaged) return true;
    return o.assignedPackageId === currentPackageId;
  });
  const selected = filtered.find((o) => o.id === value);

  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full"
        disabled={disabled}
      >
        <option value="">Select a published test…</option>
        {selectable.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code} · {o.title}
            {o.isPackaged && o.assignedPackageId !== currentPackageId
              ? reusable
                ? " (shared)"
                : " (in use)"
              : ""}
          </option>
        ))}
      </Select>
      {selected && (
        <p className="text-xs text-muted">
          {selected.code} · {selected.title}
          {selected.assignedMockLabels && selected.assignedMockLabels.length > 1
            ? ` · shared in ${selected.assignedMockLabels.join(", ")}`
            : selected.assignedMockLabel
              ? ` · locked to ${selected.assignedMockLabel}`
              : ""}
        </p>
      )}
    </div>
  );
}

export function PackageEditorDialog() {
  const { editor, closeEditor, openEditor, savePackage, replacePackage, resetPackagePilot, contentTests } =
    useAdminPackages();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [resettingPilot, setResettingPilot] = useState(false);
  const [mockPreview, setMockPreview] = useState<string | null>(null);

  const pkg = editor.pkg;
  const isEdit = pkg !== null;
  const hasEnrollments = (pkg?.enrollmentCount ?? 0) > 0;
  const contentLocked = hasEnrollments;

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
        skills: normalizeSkills(pkg.skills),
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
      setMockPreview(pkg.mockLabel ?? null);
    } else {
      setForm(emptyForm);
      setMockPreview(null);
    }
  }, [editor.open, pkg]);

  useEffect(() => {
    if (!editor.open || isEdit) return;
    let cancelled = false;
    void getNextMockNumber(form.skills, form.examType).then((next) => {
      if (cancelled) return;
      setMockPreview(next.mockLabel);
      if (!form.title.trim()) {
        setForm((f) => ({
          ...f,
          title: next.suggestedTitle,
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [editor.open, isEdit, form.skills, form.examType]);

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

  const contentComplete = useMemo(() => {
    const needs: Record<SkillId, string> = {
      listening: form.listeningTestId,
      reading: form.readingTestId,
      writing: form.writingTestId,
      speaking: form.speakingBankId,
    };
    return form.skills.every((skill) => Boolean(needs[skill]?.trim()));
  }, [form]);

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
    if (form.isActive && !contentComplete) {
      toast("Select exam content", {
        description: "Assign one published test for each skill before activating.",
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
        skills: form.skills,
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
        listeningTestId: form.skills.includes("listening")
          ? form.listeningTestId || null
          : null,
        readingTestId: form.skills.includes("reading")
          ? form.readingTestId || null
          : null,
        writingTestId: form.skills.includes("writing")
          ? form.writingTestId || null
          : null,
        speakingBankId: form.skills.includes("speaking")
          ? form.speakingBankId || null
          : null,
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

  async function handleReplaceMock() {
    if (!pkg) return;
    if (
      !window.confirm(
        "Replace this mock?\n\nThe current package will be archived and its Listening/Reading/Writing papers released for reuse. A new inactive copy opens so you can adjust content before activating.",
      )
    ) {
      return;
    }
    setReplacing(true);
    try {
      const result = await replacePackage(pkg.id);
      toast("Mock replaced", {
        description: `${result.replacement.title} is ready to review. Activate when content is correct.`,
        variant: "success",
      });
      openEditor(result.replacement);
    } catch (err) {
      toast("Replace failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setReplacing(false);
    }
  }

  async function handleResetPilot() {
    if (!pkg) return;
    if (
      !window.confirm(
        "Reset pilot data for this package?\n\nAll enrollments, orders, and exam sessions will be permanently deleted. Package content stays linked so you can rerun the same mock.\n\nBlocked while a student exam is in progress.",
      )
    ) {
      return;
    }
    setResettingPilot(true);
    try {
      const result = await resetPackagePilot(pkg.id);
      toast("Pilot reset complete", {
        description: `Cleared ${result.clearedEnrollments} enrollment(s), ${result.clearedOrders} order(s), ${result.clearedSessions} session(s). Content selects are unlocked.`,
        variant: "success",
      });
      closeEditor();
    } catch (err) {
      toast("Pilot reset failed", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setResettingPilot(false);
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
              {isEdit ? "Edit Package" : "Create Package"}
            </h2>
            <p className="text-sm text-muted">
              {mockPreview ?? (isEdit ? pkg?.mockLabel : "Assign one unique test per skill.")}
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
          {!isEdit && (
            <div className="space-y-1.5">
              <label className={labelCls}>Package type</label>
              <Select
                value={
                  PACKAGE_SKILL_PRESETS.find(
                    (p) => p.skills.join("+") === form.skills.join("+"),
                  )?.id ?? "full"
                }
                onChange={(e) => {
                  const preset = PACKAGE_SKILL_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) set("skills", preset.skills);
                }}
                className="h-10 w-full"
              >
                {PACKAGE_SKILL_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">
                Each package type has its own mock number sequence. A test can only belong to one package.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelCls}>Title</label>
            <Input
              value={form.title}
              error={titleInvalid}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Full Academic Mock 002"
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
                <p className="text-xs text-muted">Visible &amp; bookable when content is assigned.</p>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-navy">Package content</p>
                <p className="text-xs text-muted">
                  Pick one published test per included skill. Listening, Reading and Writing
                  papers already used in another package are hidden; speaking banks can be
                  reused across packages.
                  {contentLocked
                    ? " Content is locked because students have enrolled — reset pilot to rerun the same mock, or replace mock for a new package version."
                    : ""}
                </p>
              </div>
              {contentLocked && pkg && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={resettingPilot}
                    disabled={replacing}
                    onClick={() => void handleResetPilot()}
                  >
                    Reset pilot
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={replacing}
                    disabled={resettingPilot}
                    onClick={() => void handleReplaceMock()}
                  >
                    Replace mock
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4">
              {form.skills.includes("listening") && (
                <TestSelect
                  label="Listening test"
                  type="LISTENING"
                  value={form.listeningTestId}
                  options={contentTests}
                  currentPackageId={pkg?.id}
                  disabled={contentLocked}
                  onChange={(v) => set("listeningTestId", v)}
                />
              )}
              {form.skills.includes("reading") && (
                <TestSelect
                  label="Reading test"
                  type="READING"
                  value={form.readingTestId}
                  options={contentTests}
                  currentPackageId={pkg?.id}
                  disabled={contentLocked}
                  onChange={(v) => set("readingTestId", v)}
                />
              )}
              {form.skills.includes("writing") && (
                <TestSelect
                  label="Writing test"
                  type="WRITING"
                  value={form.writingTestId}
                  options={contentTests}
                  currentPackageId={pkg?.id}
                  disabled={contentLocked}
                  onChange={(v) => set("writingTestId", v)}
                />
              )}
              {form.skills.includes("speaking") && (
                <TestSelect
                  label="Speaking bank"
                  type="SPEAKING"
                  value={form.speakingBankId}
                  options={contentTests}
                  currentPackageId={pkg?.id}
                  disabled={contentLocked}
                  onChange={(v) => set("speakingBankId", v)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="secondary" size="sm" onClick={closeEditor} disabled={saving || replacing || resettingPilot}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={saving} disabled={replacing || resettingPilot} onClick={handleSave}>
            {isEdit ? "Save Changes" : "Create Package"}
          </Button>
        </div>
      </div>
    </div>
  );
}
