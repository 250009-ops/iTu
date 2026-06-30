"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Gift,
  Loader2,
  Mic,
  PenLine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAdminStudents } from "@/contexts/admin-students-context";
import { getGrantablePackagesForStudent } from "@/lib/api/admin";
import { listTeachers } from "@/lib/api/bookings";
import { getErrorMessage } from "@/lib/api/errors";
import type { Student } from "@/lib/admin/types";
import { localTodayIso } from "@/lib/student/datetime";
import { cn } from "@/lib/utils";

type Teacher = {
  id: string;
  name: string;
  email: string;
  speciality: string;
  rating: number | null;
  status: string;
};


type GrantPackage = {
  id: string;
  title: string;
  price: number;
  currency: string;
  needsWriting: boolean;
  needsSpeaking: boolean;
  mockLabel?: string;
};

type StepId = "package" | "date" | "writing" | "speaking" | "review";

const STEP_LABELS: Record<StepId, string> = {
  package: "Mock package",
  date: "Mock day",
  writing: "Writing examiner",
  speaking: "Speaking examiner",
  review: "Confirm",
};

function packageSkillIds(skills: unknown[]): string[] {
  return skills
    .map((s) => {
      if (typeof s === "string") return s.toLowerCase();
      if (s && typeof s === "object" && "id" in s) {
        return String((s as { id: unknown }).id).toLowerCase();
      }
      return "";
    })
    .filter(Boolean);
}

function toGrantPackage(pkg: {
  id: string;
  title: string;
  price: number;
  currency: string;
  skills: unknown[];
  mockLabel?: string;
}): GrantPackage {
  const ids = packageSkillIds(pkg.skills);
  return {
    id: pkg.id,
    title: pkg.title,
    price: pkg.price,
    currency: pkg.currency,
    needsWriting: ids.includes("writing"),
    needsSpeaking: ids.includes("speaking"),
    mockLabel: pkg.mockLabel,
  };
}

function buildSteps(pkg: GrantPackage | null): StepId[] {
  const steps: StepId[] = ["package", "date"];
  if (pkg?.needsWriting) steps.push("writing");
  if (pkg?.needsSpeaking) steps.push("speaking");
  steps.push("review");
  return steps;
}

export function GrantMockDialog({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { grant } = useAdminStudents();

  const [packages, setPackages] = useState<GrantPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packageId, setPackageId] = useState<string | null>(null);

  const [mockDate, setMockDate] = useState(localTodayIso());

  const [writingTeachers, setWritingTeachers] = useState<Teacher[]>([]);
  const [writingTeacherId, setWritingTeacherId] = useState<string | null>(null);
  const [speakingTeachers, setSpeakingTeachers] = useState<Teacher[]>([]);
  const [speakingTeacherId, setSpeakingTeacherId] = useState<string | null>(null);
  const [teachersLoading, setTeachersLoading] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === packageId) ?? null,
    [packages, packageId],
  );

  const steps = useMemo(() => buildSteps(selectedPackage), [selectedPackage]);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]!;

  const selectedWritingTeacher = writingTeachers.find(
    (t) => t.id === writingTeacherId,
  );
  const selectedSpeakingTeacher = speakingTeachers.find(
    (t) => t.id === speakingTeacherId,
  );

  useEffect(() => {
    let cancelled = false;
    setPackagesLoading(true);
    void getGrantablePackagesForStudent(student.id)
      .then((res) => {
        if (cancelled) return;
        setPackages(res.packages.map(toGrantPackage));
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Could not load packages"));
      })
      .finally(() => {
        if (!cancelled) setPackagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [student.id]);

  const loadTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const list = await listTeachers("writing");
      setWritingTeachers(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load examiners"));
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  const loadSpeakingTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const list = await listTeachers("speaking");
      setSpeakingTeachers(list);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load speaking examiners"));
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentStep === "writing" && writingTeachers.length === 0) {
      void loadTeachers();
    }
    if (currentStep === "speaking" && speakingTeachers.length === 0) {
      void loadSpeakingTeachers();
    }
  }, [currentStep, writingTeachers.length, speakingTeachers.length, loadTeachers, loadSpeakingTeachers]);

  // Reset downstream choices whenever the package changes.
  useEffect(() => {
    setWritingTeacherId(null);
    setSpeakingTeacherId(null);
  }, [packageId]);

  const canContinue = useMemo(() => {
    if (currentStep === "package") return Boolean(packageId);
    if (currentStep === "date") return Boolean(mockDate);
    if (currentStep === "writing") return Boolean(writingTeacherId);
    if (currentStep === "speaking") return Boolean(speakingTeacherId);
    if (currentStep === "review") return true;
    return false;
  }, [currentStep, packageId, mockDate, writingTeacherId, speakingTeacherId]);

  const isLastStep = stepIndex === steps.length - 1;

  function goNext() {
    setError(null);
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
  }

  function goBack() {
    setError(null);
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  async function handleConfirm() {
    if (!selectedPackage) return;
    if (selectedPackage.needsWriting && !writingTeacherId) return;
    if (selectedPackage.needsSpeaking && !speakingTeacherId) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await grant({
        studentId: student.id,
        packageId: selectedPackage.id,
        mockDate: new Date(`${mockDate}T12:00:00`).toISOString(),
        ...(selectedPackage.needsWriting && writingTeacherId
          ? { writingTeacherId }
          : {}),
        ...(selectedPackage.needsSpeaking && speakingTeacherId
          ? { speakingTeacherId }
          : {}),
      });
      toast("Free mock granted", {
        description: `${selectedPackage.title} granted to ${student.name} · ${result.enrollmentCode}`,
        variant: "success",
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not grant the mock. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} ariaLabel={`Grant free mock to ${student.name}`}>
      <div className="flex items-start justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Gift size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Grant free mock</h2>
            <p className="mt-0.5 text-sm text-muted">
              {student.name} · Step {Math.min(stepIndex + 1, steps.length)} of{" "}
              {steps.length} · {STEP_LABELS[currentStep]}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-6 py-3">
        {steps.map((step, index) => (
          <div key={step} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                index < stepIndex
                  ? "bg-emerald-500 text-white"
                  : index === stepIndex
                    ? "bg-navy text-white"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              {index < stepIndex ? <Check size={14} /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="h-px flex-1 bg-border" />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {currentStep === "package" && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-navy">
              Select a mock package
            </label>
            {packagesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading packages…
              </div>
            ) : packages.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {student.name} has no grantable mocks — they may have already completed or
                enrolled in every active package.
              </p>
            ) : (
              <div className="space-y-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setPackageId(pkg.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                      packageId === pkg.id
                        ? "border-navy bg-navy/5"
                        : "border-border bg-white hover:bg-slate-50",
                    )}
                  >
                    <div>
                      <p className="font-semibold text-navy">{pkg.title}</p>
                      {pkg.mockLabel && (
                        <p className="text-xs font-medium text-sky-700">{pkg.mockLabel}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {pkg.needsWriting && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                            <PenLine size={11} /> Writing
                          </span>
                        )}
                        {pkg.needsSpeaking && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                            <Mic size={11} /> Speaking
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-muted line-through">
                      {pkg.currency === "USD" ? "$" : `${pkg.currency} `}
                      {pkg.price}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === "date" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-navy">Mock day</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border px-3">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={mockDate}
                  min={localTodayIso()}
                  onChange={(e) => setMockDate(e.target.value)}
                  className="h-11 flex-1 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
              The student can start anytime on this day before the platform cutoff
              (default 18:00). Speaking time is chosen by the student from the
              assigned examiner&apos;s availability.
            </p>
          </div>
        )}

        {currentStep === "writing" && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-navy">
              Assign a writing examiner
            </label>
            {teachersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading examiners…
              </div>
            ) : writingTeachers.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No approved writing examiners available.
              </p>
            ) : (
              <div className="space-y-2">
                {writingTeachers.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setWritingTeacherId(t.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                      writingTeacherId === t.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-border bg-white hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <PenLine size={15} />
                      </div>
                      <div>
                        <p className="font-semibold text-navy">{t.name}</p>
                        <p className="text-xs text-muted">{t.email}</p>
                      </div>
                    </div>
                    {writingTeacherId === t.id && (
                      <Check className="h-4 w-4 text-violet-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === "speaking" && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-navy">
              Assign a speaking examiner
            </label>
            {teachersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading examiners…
              </div>
            ) : speakingTeachers.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No approved speaking examiners available.
              </p>
            ) : (
              <div className="space-y-2">
                {speakingTeachers.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSpeakingTeacherId(t.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                      speakingTeacherId === t.id
                        ? "border-rose-500 bg-rose-50"
                        : "border-border bg-white hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                        <Mic size={15} />
                      </div>
                      <div>
                        <p className="font-semibold text-navy">{t.name}</p>
                        <p className="text-xs text-muted">{t.email}</p>
                      </div>
                    </div>
                    {speakingTeacherId === t.id && (
                      <Check className="h-4 w-4 text-rose-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted">
              The student will pick a speaking slot from this examiner&apos;s
              availability on mock day.
            </p>
          </div>
        )}

        {currentStep === "review" && selectedPackage && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-slate-50 p-4">
              <p className="text-sm font-semibold text-navy">Grant summary</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Student</dt>
                  <dd className="font-medium text-foreground">{student.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Package</dt>
                  <dd className="font-medium text-foreground">
                    {selectedPackage.title}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Mock day</dt>
                  <dd className="font-medium text-foreground">
                    {new Date(`${mockDate}T00:00`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · flexible start
                  </dd>
                </div>
                {selectedPackage.needsWriting && (
                  <div className="flex justify-between">
                    <dt className="text-muted">Writing examiner</dt>
                    <dd className="font-medium text-foreground">
                      {selectedWritingTeacher?.name ?? "—"}
                    </dd>
                  </div>
                )}
                {selectedPackage.needsSpeaking && (
                  <div className="flex justify-between">
                    <dt className="text-muted">Speaking examiner</dt>
                    <dd className="font-medium text-foreground">
                      {selectedSpeakingTeacher?.name ?? "—"}
                    </dd>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-border pt-2">
                  <dt className="font-semibold text-navy">Charge</dt>
                  <dd className="font-bold text-emerald-600">
                    Free · $0.00
                  </dd>
                </div>
              </dl>
            </div>
            <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <Gift size={12} />
              A complimentary $0 order will be recorded and the student will be
              notified. The student schedules their speaking slot on mock day.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <Button
          variant="secondary"
          onClick={stepIndex === 0 ? onClose : goBack}
          disabled={submitting}
        >
          {stepIndex === 0 ? "Cancel" : "Back"}
        </Button>
        {!isLastStep ? (
          <Button variant="primary" onClick={goNext} disabled={!canContinue}>
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleConfirm}
            disabled={!canContinue}
            loading={submitting}
          >
            Grant free mock
          </Button>
        )}
      </div>
    </Modal>
  );
}
