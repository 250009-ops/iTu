"use client";

import { useMemo, useState } from "react";
import {
  cancelInstitutionEnrollment,
  getInstitutionEnrollments,
  getInstitutionExaminers,
  reassignInstitutionExaminers,
} from "@/lib/api/institution";
import { downloadResultPdf } from "@/lib/api/results";
import { getErrorMessage } from "@/lib/api/errors";
import { useApiQuery } from "@/hooks/use-api-query";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import type { EnrollmentRow, ExaminerRow } from "@/lib/institution/types";
import {
  BandPill,
  EmptyState,
  LoadingRow,
  PageHeader,
  ProgressDots,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/institution/ui";
import { PortalPage } from "@/components/portal/portal-page";

function examinerLabel(e: EnrollmentRow): string {
  const parts: string[] = [];
  if (e.needsWriting) {
    parts.push(`W: ${e.writingTeacherName ?? "Unassigned"}`);
  }
  if (e.needsSpeaking) {
    parts.push(`S: ${e.speakingTeacherName ?? "Unassigned"}`);
  }
  if (parts.length === 0) return e.examiner ?? "—";
  return parts.join(" · ");
}

function formatScheduleTiming(e: EnrollmentRow): string {
  const date = new Date(e.mockDate).toLocaleDateString();
  const parts: string[] = [date];
  if (e.mockTime) parts.push(`start ${e.mockTime}`);
  if (e.needsSpeaking) {
    parts.push(e.speakingTime ? `speaking ${e.speakingTime}` : "speaking TBA");
  }
  return parts.join(" · ");
}

function ReassignExaminersModal({
  enrollment,
  examiners,
  onClose,
  onSaved,
}: {
  enrollment: EnrollmentRow;
  examiners: ExaminerRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [writingTeacherId, setWritingTeacherId] = useState(
    enrollment.writingTeacherId ?? "",
  );
  const [speakingTeacherId, setSpeakingTeacherId] = useState(
    enrollment.speakingTeacherId ?? "",
  );
  const [saving, setSaving] = useState(false);

  const writingExaminers = examiners.filter(
    (e) =>
      e.status === "active" &&
      (e.speciality === "writing" || e.speciality === "both"),
  );
  const speakingExaminers = examiners.filter(
    (e) =>
      e.status === "active" &&
      (e.speciality === "speaking" || e.speciality === "both"),
  );

  async function handleSave() {
    const body: { writingTeacherId?: string; speakingTeacherId?: string } = {};
    if (
      enrollment.needsWriting &&
      writingTeacherId &&
      writingTeacherId !== (enrollment.writingTeacherId ?? "")
    ) {
      body.writingTeacherId = writingTeacherId;
    }
    if (
      enrollment.needsSpeaking &&
      speakingTeacherId &&
      speakingTeacherId !== (enrollment.speakingTeacherId ?? "")
    ) {
      body.speakingTeacherId = speakingTeacherId;
    }
    if (!body.writingTeacherId && !body.speakingTeacherId) {
      toast("No changes", {
        description: "Select a different examiner to reassign.",
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      await reassignInstitutionExaminers(enrollment.id, body);
      toast("Examiners updated", {
        description: body.speakingTeacherId
          ? "Speaking slot moved to the new examiner at the same time."
          : undefined,
        variant: "success",
      });
      onSaved();
      onClose();
    } catch (err) {
      toast("Could not reassign", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-navy">Reassign examiners</h2>
        <p className="mt-1 text-sm text-muted">
          {enrollment.studentName} · {enrollment.packageTitle}
        </p>
        {enrollment.needsSpeaking && enrollment.speakingTime && (
          <p className="mt-2 text-xs text-muted">
            Speaking stays at {enrollment.speakingTime}. The new examiner must be
            free at that time.
          </p>
        )}

        <div className="mt-5 space-y-4">
          {enrollment.needsWriting && (
            <label className="block text-sm">
              <span className="font-medium text-navy">Writing examiner</span>
              <select
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                value={writingTeacherId}
                onChange={(e) => setWritingTeacherId(e.target.value)}
              >
                <option value="">Select writing examiner</option>
                {writingExaminers.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {enrollment.needsSpeaking && (
            <label className="block text-sm">
              <span className="font-medium text-navy">Speaking examiner</span>
              <select
                className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                value={speakingTeacherId}
                onChange={(e) => setSpeakingTeacherId(e.target.value)}
              >
                <option value="">Select speaking examiner</option>
                {speakingExaminers.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InstitutionScheduleView() {
  const { data, loading, refresh } = useApiQuery(getInstitutionEnrollments);
  const examinersQuery = useApiQuery(getInstitutionExaminers);
  const { toast } = useToast();
  const [reassignTarget, setReassignTarget] = useState<EnrollmentRow | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const examiners = useMemo(
    () => examinersQuery.data?.examiners ?? [],
    [examinersQuery.data],
  );

  async function handleCancel(enrollment: EnrollmentRow) {
    if (
      !window.confirm(
        `Cancel mock for ${enrollment.studentName}? The speaking slot will be released.`,
      )
    ) {
      return;
    }
    setBusyId(enrollment.id);
    try {
      await cancelInstitutionEnrollment(enrollment.id);
      toast("Enrollment cancelled", { variant: "success" });
      refresh();
    } catch (err) {
      toast("Could not cancel", {
        description: getErrorMessage(err, "Please try again."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDownloadPdf(enrollment: EnrollmentRow) {
    setBusyId(enrollment.id);
    try {
      await downloadResultPdf(
        enrollment.id,
        `itestu-report-${enrollment.enrollmentCode}.pdf`,
      );
      toast("PDF downloaded", { variant: "success" });
    } catch (err) {
      toast("Could not download PDF", {
        description: getErrorMessage(err, "Results PDF is not available yet."),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalPage>
      <PageHeader
        breadcrumb="Institution &gt; Mock Schedule"
        title="Mock Schedule"
        description="Track every mock your students are enrolled in and their progress. Cancel before start, or download the certificate PDF when results are released."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Scheduled"
          value={data?.summary.scheduled ?? "—"}
          accent="navy"
        />
        <StatCard
          label="In progress"
          value={data?.summary.inProgress ?? "—"}
          accent="violet"
        />
        <StatCard
          label="Awaiting results"
          value={data?.summary.awaitingResults ?? "—"}
          accent="amber"
        />
        <StatCard
          label="Completed"
          value={data?.summary.completed ?? "—"}
          accent="emerald"
        />
      </div>

      <SectionCard title="Enrollments">
        {loading ? (
          <LoadingRow />
        ) : !data?.enrollments.length ? (
          <EmptyState message="No enrollments yet. Enroll students from the Students page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Package</th>
                  <th className="px-5 py-3 font-medium">Timing</th>
                  <th className="px-5 py-3 font-medium">Examiner</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Results</th>
                  <th className="px-5 py-3 font-medium">Band</th>
                  <th className="px-5 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {data.enrollments.map((e) => {
                  const canReassign =
                    (e.needsWriting || e.needsSpeaking) &&
                    e.status !== "cancelled" &&
                    e.status !== "completed" &&
                    e.status !== "missed";
                  const missing =
                    (e.needsWriting && !e.writingTeacherId) ||
                    (e.needsSpeaking && !e.speakingTeacherId);
                  const canPdf = e.resultsStatus === "released";
                  const busy = busyId === e.id;
                  return (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-navy">
                        {e.studentName}
                      </td>
                      <td className="px-5 py-3 text-muted">{e.packageTitle}</td>
                      <td className="px-5 py-3 text-muted">
                        {formatScheduleTiming(e)}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        <span className={missing ? "text-amber-700" : undefined}>
                          {examinerLabel(e)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <ProgressDots progress={e.progress} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={e.status} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={e.resultsStatus} />
                      </td>
                      <td className="px-5 py-3">
                        <BandPill band={e.overallBand} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canPdf && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => void handleDownloadPdf(e)}
                            >
                              {busy ? "…" : "PDF"}
                            </Button>
                          )}
                          {canReassign && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => setReassignTarget(e)}
                            >
                              {missing ? "Assign" : "Reassign"}
                            </Button>
                          )}
                          {e.canCancel && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => void handleCancel(e)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {reassignTarget && (
        <ReassignExaminersModal
          enrollment={reassignTarget}
          examiners={examiners}
          onClose={() => setReassignTarget(null)}
          onSaved={() => refresh()}
        />
      )}
    </PortalPage>
  );
}
