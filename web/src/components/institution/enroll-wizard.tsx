"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  enrollStudents,
  getInstitutionEnrollmentPackages,
  getInstitutionExaminers,
  type EnrollmentMockOption,
  type EnrollmentPackagesGrouped,
} from "@/lib/api/institution";
import type { ExaminerRow } from "@/lib/institution/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";
import {
  packageMatchesTypeTab,
  STUDENT_BROWSE_TYPE_TABS,
  type PackageTypeTabId,
} from "@/lib/package-type-tabs";
import {
  allSpeakingGridTimes,
  isSpeakingGridTime,
} from "@/lib/speaking/slot-grid";
import { cn } from "@/lib/utils";

function packageNeeds(pkg: EnrollmentMockOption | undefined) {
  if (!pkg) return { writing: false, speaking: false };
  if (pkg.needsWriting != null || pkg.needsSpeaking != null) {
    return {
      writing: Boolean(pkg.needsWriting),
      speaking: Boolean(pkg.needsSpeaking),
    };
  }
  const skills = (pkg.skills ?? []).map((s) => s.toLowerCase());
  return {
    writing: skills.includes("writing"),
    speaking: skills.includes("speaking"),
  };
}

export function EnrollWizard({
  open,
  studentId,
  studentName,
  initialPackageId,
  onClose,
  onEnrolled,
}: {
  open: boolean;
  studentId: string;
  studentName?: string;
  initialPackageId?: string;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<EnrollmentPackagesGrouped | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [examiners, setExaminers] = useState<ExaminerRow[]>([]);
  const [typeFilter, setTypeFilter] =
    useState<PackageTypeTabId>("full-academic");
  const [packageId, setPackageId] = useState("");
  const [mockDate, setMockDate] = useState("");
  const [writingTeacherId, setWritingTeacherId] = useState("");
  const [speakingTeacherId, setSpeakingTeacherId] = useState("");
  const [speakingTime, setSpeakingTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !studentId) return;
    setPackageId(initialPackageId ?? "");
    setMockDate("");
    setWritingTeacherId("");
    setSpeakingTeacherId("");
    setSpeakingTime("");
    setLoadingPackages(true);
    void getInstitutionEnrollmentPackages(studentId)
      .then((res) => {
        setData(res);
        if (initialPackageId) {
          const mock = res.mocks.find((m) => m.id === initialPackageId);
          if (mock) {
            const tab = STUDENT_BROWSE_TYPE_TABS.find((t) =>
              packageMatchesTypeTab(mock, t.id),
            );
            if (tab) setTypeFilter(tab.id);
          }
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoadingPackages(false));
    void getInstitutionExaminers()
      .then((res) =>
        setExaminers(res.examiners.filter((e) => e.status === "active")),
      )
      .catch(() => setExaminers([]));
  }, [open, studentId, initialPackageId]);

  const mocks = data?.mocks ?? [];

  /** Only enrollable (not taken / not in progress) mocks for the selected type. */
  const filteredMocks = useMemo(() => {
    return mocks.filter(
      (mock) =>
        packageMatchesTypeTab(mock, typeFilter) &&
        mock.enrollStatus === "available",
    );
  }, [mocks, typeFilter]);

  const selectedPackage = useMemo(() => {
    if (!packageId) return undefined;
    return mocks.find((p) => p.id === packageId);
  }, [packageId, mocks]);

  const needs = packageNeeds(selectedPackage);
  const canSelectSelected =
    !selectedPackage || selectedPackage.enrollStatus === "available";

  const writingExaminers = examiners.filter(
    (e) => e.speciality === "writing" || e.speciality === "both",
  );
  const speakingExaminers = examiners.filter(
    (e) => e.speciality === "speaking" || e.speciality === "both",
  );

  const canSubmit = Boolean(
    packageId &&
      canSelectSelected &&
      mockDate &&
      (!needs.writing || writingTeacherId) &&
      (!needs.speaking ||
        (speakingTeacherId && isSpeakingGridTime(speakingTime))),
  );

  async function handleSubmit() {
    if (!canSubmit) {
      toast("Missing details", {
        description: needs.speaking
          ? "Choose an available mock, date, examiners, and a speaking time."
          : "Choose an available mock, mock date, and required examiners.",
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await enrollStudents({
        studentIds: [studentId],
        packageId,
        mockDate,
        writingTeacherId: writingTeacherId || undefined,
        speakingTeacherId: speakingTeacherId || undefined,
        speakingTime: isSpeakingGridTime(speakingTime)
          ? speakingTime
          : undefined,
      });
      if (res.enrolled > 0) {
        toast(`Enrolled ${studentName ?? "student"}`, {
          description:
            res.failed.length > 0
              ? `${res.failed.length} could not be enrolled.`
              : "Centre mock enrolled with assigned examiners.",
          variant: res.failed.length > 0 ? "warning" : "success",
        });
        onEnrolled();
        onClose();
      } else {
        toast("Nothing enrolled", {
          description:
            res.failed[0]?.error ?? "Enrollment failed for this student.",
          variant: "error",
        });
      }
    } catch (err) {
      toast("Enrollment failed", {
        description: getErrorMessage(err, "Could not enroll student."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const hasAnyMocks = mocks.some((m) => m.enrollStatus === "available");

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Enroll student"
      className="max-w-xl"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-navy">
          Enroll {studentName ?? "student"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto p-5">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
          Enroll in centre mocks assembled on the{" "}
          <Link
            href="/institution/mocks"
            className="font-semibold text-navy underline"
          >
            Mocks
          </Link>{" "}
          page. Pick a mock type, then an available mock.
        </p>

        {!hasAnyMocks && !loadingPackages && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            No active mocks yet. Create and activate mocks on the{" "}
            <Link
              href="/institution/mocks"
              className="font-semibold underline"
            >
              Mocks
            </Link>{" "}
            page (from purchased tests or Content Studio).
          </p>
        )}

        <Field label="Mock type">
          <div className="flex flex-wrap gap-2">
            {STUDENT_BROWSE_TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setTypeFilter(tab.id);
                  setPackageId("");
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  typeFilter === tab.id
                    ? "bg-navy text-white"
                    : "bg-slate-100 text-muted hover:bg-slate-200 hover:text-navy",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Mock">
          {loadingPackages ? (
            <p className="text-sm text-muted">Loading mocks…</p>
          ) : filteredMocks.length === 0 ? (
            <p className="text-sm text-muted">
              No available mocks of this type. Activate a mock on the Mocks page,
              or pick another type.
            </p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {filteredMocks.map((mock) => {
                const selected = packageId === mock.id;
                return (
                  <button
                    key={mock.id}
                    type="button"
                    onClick={() => {
                      setPackageId(mock.id);
                      setWritingTeacherId("");
                      setSpeakingTeacherId("");
                      setSpeakingTime("");
                    }}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                      selected
                        ? "border-navy bg-sky-50"
                        : "border-border hover:border-navy/40",
                    )}
                  >
                    <div>
                      <p className="font-semibold text-navy">{mock.title}</p>
                      <p className="text-xs text-muted">
                        {mock.mockLabel ?? mock.packageKind}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="Mock date">
          <input
            type="date"
            min={today}
            value={mockDate}
            onChange={(e) => setMockDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          />
        </Field>

        {needs.writing && (
          <Field label="Writing examiner">
            <select
              value={writingTeacherId}
              onChange={(e) => setWritingTeacherId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
            >
              <option value="">Select writing examiner…</option>
              {writingExaminers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {needs.speaking && (
          <>
            <Field label="Speaking examiner">
              <select
                value={speakingTeacherId}
                onChange={(e) => {
                  setSpeakingTeacherId(e.target.value);
                  setSpeakingTime("");
                }}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
              >
                <option value="">Select speaking examiner…</option>
                {speakingExaminers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Speaking time">
              {!speakingTeacherId || !mockDate ? (
                <p className="text-sm text-muted">
                  Select a speaking examiner and mock date first.
                </p>
              ) : (
                <SpeakingTimeGridSelect
                  value={speakingTime}
                  onChange={setSpeakingTime}
                />
              )}
            </Field>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={submitting}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          Confirm enrollment
        </Button>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-navy">{label}</span>
      {children}
    </label>
  );
}

function SpeakingTimeGridSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const hours = useMemo(() => {
    const set = new Set<string>();
    for (const t of allSpeakingGridTimes()) {
      set.add(t.slice(0, 2));
    }
    return [...set];
  }, []);
  const hour = value ? value.slice(0, 2) : "";
  const minuteSlots = useMemo(() => {
    if (!hour) return [];
    return allSpeakingGridTimes().filter((t) => t.startsWith(`${hour}:`));
  }, [hour]);

  return (
    <div className="space-y-2">
      <select
        value={hour}
        onChange={(e) => {
          const nextHour = e.target.value;
          onChange(nextHour ? `${nextHour}:00` : "");
        }}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
      >
        <option value="">Select hour…</option>
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}:00
          </option>
        ))}
      </select>
      {hour ? (
        <div className="flex flex-wrap gap-2">
          {minuteSlots.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums",
                value === t
                  ? "border-rose-500 bg-rose-500 text-white"
                  : "border-border bg-white text-foreground hover:bg-slate-50",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-[11px] text-muted">
        Only :00 / :20 / :40 slots (20 minutes).
      </p>
    </div>
  );
}
