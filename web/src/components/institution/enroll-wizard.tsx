"use client";

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

export function EnrollWizard({
  open,
  studentIds,
  onClose,
  onEnrolled,
}: {
  open: boolean;
  studentIds: string[];
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<EnrollmentPackagesGrouped>({
    platform: [],
    own: [],
  });
  const [examiners, setExaminers] = useState<ExaminerRow[]>([]);
  const [packageId, setPackageId] = useState("");
  const [mockDate, setMockDate] = useState("");
  const [writingTeacherId, setWritingTeacherId] = useState("");
  const [speakingTeacherId, setSpeakingTeacherId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void getInstitutionEnrollmentPackages().then(setGroups);
    void getInstitutionExaminers()
      .then((res) => setExaminers(res.examiners.filter((e) => e.status === "active")))
      .catch(() => setExaminers([]));
  }, [open]);

  const selectedPackage = useMemo(() => {
    return (
      groups.platform.find((p) => p.id === packageId) ??
      groups.own.find((p) => p.id === packageId)
    );
  }, [groups, packageId]);

  const costsCredits = selectedPackage?.costsCredit ?? true;
  const creditCost = costsCredits ? studentIds.length : 0;

  const writingExaminers = examiners.filter(
    (e) => e.speciality === "writing" || e.speciality === "both",
  );
  const speakingExaminers = examiners.filter(
    (e) => e.speciality === "speaking" || e.speciality === "both",
  );

  async function handleSubmit() {
    if (!packageId || !mockDate) {
      toast("Missing details", {
        description: "Choose a package and mock date.",
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await enrollStudents({
        studentIds,
        packageId,
        mockDate,
        writingTeacherId: writingTeacherId || undefined,
        speakingTeacherId: speakingTeacherId || undefined,
      });
      if (res.enrolled > 0) {
        toast(`Enrolled ${res.enrolled} student${res.enrolled !== 1 ? "s" : ""}`, {
          description:
            res.failed.length > 0
              ? `${res.failed.length} could not be enrolled.`
              : costsCredits
                ? `Credit balance: ${res.creditBalance}`
                : "No credits spent — centre-owned package.",
          variant: res.failed.length > 0 ? "warning" : "success",
        });
        onEnrolled();
        onClose();
      } else {
        toast("Nothing enrolled", {
          description:
            res.failed[0]?.error ?? "Enrollment failed for all selected students.",
          variant: "error",
        });
      }
    } catch (err) {
      toast("Enrollment failed", {
        description: getErrorMessage(err, "Could not enroll students."),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Enroll students" className="max-w-lg">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-navy">
          Enroll {studentIds.length} student{studentIds.length !== 1 ? "s" : ""}
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
          {costsCredits ? (
            <>
              Platform mock: spends <strong>{creditCost}</strong> credit
              {creditCost !== 1 ? "s" : ""} (1 per student).
            </>
          ) : (
            <>
              Your centre&apos;s mock: <strong>no credit cost</strong> for{" "}
              {studentIds.length} student{studentIds.length !== 1 ? "s" : ""}.
            </>
          )}
        </p>

        <Field label="Mock package">
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          >
            <option value="">Select a package…</option>
            {groups.platform.length > 0 && (
              <optgroup label="Platform mocks (1 credit each)">
                {groups.platform.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mockLabel} — {p.title}
                  </option>
                ))}
              </optgroup>
            )}
            {groups.own.length > 0 && (
              <optgroup label="Your centre's mocks (no credit)">
                {groups.own.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mockLabel} — {p.title}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
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

        <Field label="Writing examiner (optional)">
          <select
            value={writingTeacherId}
            onChange={(e) => setWritingTeacherId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          >
            <option value="">Auto / not required</option>
            {writingExaminers.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Speaking examiner (optional)">
          <select
            value={speakingTeacherId}
            onChange={(e) => setSpeakingTeacherId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
          >
            <option value="">Auto / not required</option>
            {speakingExaminers.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={submitting}
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
