"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  enrollStudents,
  getInstitutionEnrollmentPackages,
  getInstitutionExaminers,
  type EnrollmentPackagesGrouped,
} from "@/lib/api/institution";
import type { ExaminerRow } from "@/lib/institution/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/api/errors";

type EnrollPackageOption = {
  id: string;
  title: string;
  packageKind: string;
  mockNumber: number;
  skills?: string[];
  needsWriting?: boolean;
  needsSpeaking?: boolean;
};

function normalizeTimeInput(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value.trim();
  return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}

function packageNeeds(pkg: EnrollPackageOption | undefined) {
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
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoadingPackages(false));
    void getInstitutionExaminers()
      .then((res) => setExaminers(res.examiners.filter((e) => e.status === "active")))
      .catch(() => setExaminers([]));
  }, [open, studentId, initialPackageId]);

  const selectedPackage = useMemo(() => {
    if (!packageId || !data) return undefined;
    return (
      data.platform.find((p) => p.id === packageId) ??
      data.own.find((p) => p.id === packageId)
    ) as EnrollPackageOption | undefined;
  }, [packageId, data]);

  const needs = packageNeeds(selectedPackage);
  const isGrantedPlatform = Boolean(
    packageId && data?.platform.some((p) => p.id === packageId),
  );
  const hasOwnPackages = (data?.own.length ?? 0) > 0;
  const hasPlatformPackages = (data?.platform.length ?? 0) > 0;

  const writingExaminers = examiners.filter(
    (e) => e.speciality === "writing" || e.speciality === "both",
  );
  const speakingExaminers = examiners.filter(
    (e) => e.speciality === "speaking" || e.speciality === "both",
  );

  const canSubmit = Boolean(
    packageId &&
      mockDate &&
      (!needs.writing || writingTeacherId) &&
      (!needs.speaking || (speakingTeacherId && speakingTime)),
  );

  async function handleSubmit() {
    if (!canSubmit) {
      toast("Missing details", {
        description: needs.speaking
          ? "Choose package, date, examiners, and a speaking time."
          : "Choose a package, mock date, and required examiners.",
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
        speakingTime: speakingTime ? normalizeTimeInput(speakingTime) : undefined,
      });
      if (res.enrolled > 0) {
        toast(`Enrolled ${studentName ?? "student"}`, {
          description:
            res.failed.length > 0
              ? `${res.failed.length} could not be enrolled.`
              : isGrantedPlatform
                ? "Granted platform mock — speaking time set by your centre."
                : "Centre mock enrolled with assigned examiners and speaking time.",
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

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Enroll student" className="max-w-lg">
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
        {isGrantedPlatform ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Granted platform mock from your admin-assigned sets —{" "}
            <strong>no credit cost</strong>. Assign examiners and speaking time
            here; the student will not choose them.
          </p>
        ) : packageId ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Your centre&apos;s mock: <strong>no credit cost</strong>. You set
            examiners and speaking time for the student.
          </p>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
            Choose an owned platform mock set or your centre&apos;s own mock.
          </p>
        )}

        {!hasPlatformPackages && !hasOwnPackages && !loadingPackages && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            No mocks available for this student. Open{" "}
            <Link href="/institution/mocks/shop" className="font-semibold underline">
              Buy mock sets
            </Link>{" "}
            or{" "}
            <Link href="/institution/mocks" className="font-semibold underline">
              Mocks
            </Link>{" "}
            to see owned sets, or create centre-owned packages in Content Studio.
          </p>
        )}

        <Field label="Mock package">
          {loadingPackages ? (
            <p className="text-sm text-muted">Loading available mocks…</p>
          ) : !hasPlatformPackages && !hasOwnPackages ? (
            <p className="text-sm text-muted">
              No mocks available for this student right now.
            </p>
          ) : (
            <select
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value);
                setWritingTeacherId("");
                setSpeakingTeacherId("");
                setSpeakingTime("");
              }}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
            >
              <option value="">Select a package…</option>
              {hasPlatformPackages && (
                <optgroup label="Granted platform mocks">
                  {data!.platform.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {hasOwnPackages && (
                <optgroup label="Your centre's mocks">
                  {data!.own.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
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
            {writingExaminers.length === 0 && (
              <p className="mt-1 text-xs text-amber-800">
                No active writing examiners. Invite one under Examiners.
              </p>
            )}
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
              {speakingExaminers.length === 0 && (
                <p className="mt-1 text-xs text-amber-800">
                  No active speaking examiners. Invite one under Examiners.
                </p>
              )}
            </Field>

            <Field label="Speaking time">
              {!speakingTeacherId || !mockDate ? (
                <p className="text-sm text-muted">
                  Select a speaking examiner and mock date first.
                </p>
              ) : (
                <>
                  <input
                    type="time"
                    value={speakingTime}
                    onChange={(e) => setSpeakingTime(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Live speaking session on the mock date (~20 minutes). Each
                    examiner can only be booked once at the same time.
                  </p>
                </>
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
          onClick={handleSubmit}
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
