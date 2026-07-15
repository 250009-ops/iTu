"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getAdminTeacher, updateTeacherRates } from "@/lib/api/admin";
import { getExaminerRateTiers } from "@/lib/api/settings";
import { getErrorMessage } from "@/lib/api/errors";
import {
  DEFAULT_BAND_TIERS,
  mergeBandTiers,
  netExaminerPayout,
  tierDefaultsForBands,
  type BandTiers,
} from "@/lib/examiner-rate-tiers";
import type { Examiner, TeacherSpeciality, TeacherStatus } from "@/lib/admin/types";
import { useAdminTeachers } from "@/contexts/admin-teachers-context";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";

const statusStyles: Record<
  TeacherStatus,
  { label: string; pill: string }
> = {
  approved: { label: "Approved", pill: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Pending review", pill: "bg-amber-50 text-amber-700" },
  suspended: { label: "Suspended", pill: "bg-rose-50 text-rose-700" },
};

const specialityLabels: Record<TeacherSpeciality, string> = {
  writing: "Writing",
  speaking: "Speaking",
  both: "Both",
};

type Props = {
  teacher: Examiner | null;
  onClose: () => void;
};

export function TeacherDetailDrawer({ teacher, onClose }: Props) {
  const { toast } = useToast();
  const { updateStatus, refresh } = useAdminTeachers();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificatesReviewed, setCertificatesReviewed] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getAdminTeacher>> | null>(
    null,
  );
  const [rateTiers, setRateTiers] = useState<BandTiers>(DEFAULT_BAND_TIERS);
  const [approvedWritingRate, setApprovedWritingRate] = useState("");
  const [approvedSpeakingRate, setApprovedSpeakingRate] = useState("");
  const [platformSharePercent, setPlatformSharePercent] = useState("");

  useEffect(() => {
    getExaminerRateTiers()
      .then((tiers) => setRateTiers(mergeBandTiers(tiers)))
      .catch(() => setRateTiers(DEFAULT_BAND_TIERS));
  }, []);

  useEffect(() => {
    if (!teacher) {
      setDetail(null);
      setCertificatesReviewed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCertificatesReviewed(false);

    getAdminTeacher(teacher.id)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          const app = data.application;
          const defaults = tierDefaultsForBands(
            rateTiers,
            app?.ieltsWritingBand ?? 7.5,
            app?.ieltsSpeakingBand ?? 7.5,
          );
          setApprovedWritingRate(
            String(
              data.approvedWritingRate ??
                data.requestedWritingRate ??
                defaults.writing.defaultRate,
            ),
          );
          setApprovedSpeakingRate(
            String(
              data.approvedSpeakingRate ??
                data.requestedSpeakingRate ??
                defaults.speaking.defaultRate,
            ),
          );
          setPlatformSharePercent(
            String(data.platformSharePercent ?? defaults.writing.platformPercent),
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load teacher details"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teacher, rateTiers]);

  const tierDefaults = useMemo(() => {
    const app = detail?.application;
    return tierDefaultsForBands(
      rateTiers,
      app?.ieltsWritingBand ?? 7.5,
      app?.ieltsSpeakingBand ?? 7.5,
    );
  }, [detail?.application, rateTiers]);

  const writingNet = netExaminerPayout(
    Number(approvedWritingRate) || 0,
    Number(platformSharePercent) || 0,
  );
  const speakingNet = netExaminerPayout(
    Number(approvedSpeakingRate) || 0,
    Number(platformSharePercent) || 0,
  );

  const hasCertificates = (detail?.application?.certificateUrls?.length ?? 0) > 0;

  async function handleUpdated() {
    await refresh();
    onClose();
  }

  async function handleSaveRates(approve: boolean) {
    if (!teacher) return;
    if (approve && hasCertificates && !certificatesReviewed) {
      toast("Review required", {
        description: "Confirm you have reviewed certificates before approving.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      await updateTeacherRates(teacher.id, {
        approvedWritingRate: Number(approvedWritingRate),
        approvedSpeakingRate: Number(approvedSpeakingRate),
        platformSharePercent: Number(platformSharePercent),
        ...(approve ? { status: "approved" as const } : {}),
      });
      toast(approve ? "Examiner approved" : "Rates saved", {
        description: approve
          ? "Approved rates are now active for future grading payouts."
          : "Examiner payout rates have been updated.",
        variant: "success",
      });
      await handleUpdated();
    } catch (err) {
      toast("Failed to save rates", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!teacher) return;
    setSaving(true);
    try {
      await updateStatus(teacher.id, "suspended");
      toast("Application rejected", {
        description: `${teacher.name} has been notified by email.`,
        variant: "warning",
      });
      setRejectOpen(false);
      await handleUpdated();
    } catch (err) {
      toast("Failed to reject application", {
        description: getErrorMessage(err, "Please try again."),
        variant: "warning",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!teacher) return null;

  const app = detail?.application;
  const status = statusStyles[teacher.status];
  const isRejected = teacher.status === "suspended" && Boolean(app?.rejectedAt);
  const displayStatus = isRejected
    ? { label: "Rejected", pill: "bg-slate-100 text-slate-700" }
    : status;
  const isPending = teacher.status === "pending";
  const languages = Array.isArray(detail?.languages)
    ? (detail.languages as string[])
    : [];
  const credentials = Array.isArray(detail?.credentials)
    ? (detail.credentials as string[])
    : [];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-navy/30 backdrop-blur-[2px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="teacher-detail-title"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
              {teacher.initials}
            </div>
            <div>
              <h2 id="teacher-detail-title" className="text-lg font-bold text-navy">
                {teacher.name}
              </h2>
              <p className="text-sm text-muted">{teacher.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {!loading && !error && detail && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    displayStatus.pill,
                  )}
                >
                  {displayStatus.label}
                </span>
                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                  {specialityLabels[teacher.speciality]}
                </span>
                {teacher.rating != null && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {teacher.rating}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Sessions
                  </p>
                  <p className="mt-1 text-lg font-bold text-navy">
                    {teacher.sessions.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Total earned
                  </p>
                  <p className="mt-1 text-lg font-bold text-navy">
                    {formatPrice(teacher.totalEarned)}
                  </p>
                </div>
              </div>

              {app && (
                <section
                  className={cn(
                    "rounded-xl border p-4",
                    isPending
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-border bg-slate-50/50",
                  )}
                >
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <Award className="h-4 w-4 text-amber-600" />
                    Application details
                    {!isPending && (
                      <span className="text-xs font-normal text-muted">(on file)</span>
                    )}
                  </h3>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted">IELTS Writing</dt>
                      <dd className="font-semibold text-navy">
                        Band {app.ieltsWritingBand ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">IELTS Speaking</dt>
                      <dd className="font-semibold text-navy">
                        Band {app.ieltsSpeakingBand ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Experience</dt>
                      <dd className="font-semibold text-navy">
                        {app.yearsExperience ?? "—"} years
                      </dd>
                    </div>
                  </dl>
                  {credentials.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted">Credentials</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {credentials.map((credential) => (
                          <span
                            key={credential}
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium text-navy ring-1",
                              isPending
                                ? "bg-white ring-amber-200"
                                : "bg-white ring-border",
                            )}
                          >
                            {credential}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {app.certificateUrls?.length ? (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted">Certificates</p>
                      <ul className="mt-2 space-y-2">
                        {app.certificateUrls.map((url, i) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setCertificatesReviewed(true)}
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-navy hover:bg-slate-50"
                            >
                              <FileText className="h-4 w-4 text-violet-600" />
                              Certificate {i + 1}
                              <ExternalLink className="h-3.5 w-3.5 text-muted" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              )}

              {isPending && hasCertificates && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/30 p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={certificatesReviewed}
                    onChange={(e) => setCertificatesReviewed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-navy focus:ring-navy/30"
                  />
                  <span>
                    <span className="font-semibold text-navy">
                      I have reviewed the certificates and application details
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      Open each certificate above to verify qualifications before approving.
                    </span>
                  </span>
                </label>
              )}

              <section className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-navy">Payout rates</h3>
                <p className="mt-1 text-xs text-muted">
                  Set how much this examiner earns per graded session. Student booking
                  price does not change.
                </p>
                {(detail.requestedWritingRate != null ||
                  detail.requestedSpeakingRate != null) && (
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {detail.requestedWritingRate != null && (
                      <div>
                        <dt className="text-xs text-muted">Requested writing</dt>
                        <dd className="font-semibold text-navy">
                          {formatPrice(detail.requestedWritingRate)}
                        </dd>
                      </div>
                    )}
                    {detail.requestedSpeakingRate != null && (
                      <div>
                        <dt className="text-xs text-muted">Requested speaking</dt>
                        <dd className="font-semibold text-navy">
                          {formatPrice(detail.requestedSpeakingRate)}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted">
                      Approved writing (so&apos;m)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={approvedWritingRate}
                      onChange={(e) => setApprovedWritingRate(e.target.value)}
                      className="mt-1 h-9"
                    />
                    <p className="mt-1 text-xs text-muted">
                      Tier default: {formatPrice(tierDefaults.writing.defaultRate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted">
                      Approved speaking (so&apos;m)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={approvedSpeakingRate}
                      onChange={(e) => setApprovedSpeakingRate(e.target.value)}
                      className="mt-1 h-9"
                    />
                    <p className="mt-1 text-xs text-muted">
                      Tier default: {formatPrice(tierDefaults.speaking.defaultRate)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted">
                      Platform share (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={platformSharePercent}
                      onChange={(e) => setPlatformSharePercent(e.target.value)}
                      className="mt-1 h-9 w-28"
                    />
                  </div>
                </div>
                <dl className="mt-4 grid gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-emerald-800">Writing net pay</dt>
                    <dd className="font-bold text-emerald-900">{formatPrice(writingNet)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-emerald-800">Speaking net pay</dt>
                    <dd className="font-bold text-emerald-900">{formatPrice(speakingNet)}</dd>
                  </div>
                </dl>
              </section>

              {detail.bio && (
                <section>
                  <h3 className="text-sm font-semibold text-navy">Bio</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{detail.bio}</p>
                </section>
              )}

              {languages.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-navy">Languages</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {languages.map((lang) => (
                      <span
                        key={lang}
                        className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <div className="rounded-xl border border-border bg-slate-50 p-4 text-sm">
                <p className="flex items-center gap-2 text-muted">
                  <Mail className="h-4 w-4" />
                  Joined {teacher.joined}
                </p>
                {app?.submittedAt && (
                  <p className="mt-1 text-xs text-muted">
                    Application submitted{" "}
                    {new Date(app.submittedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {isPending && (
              <>
                <Button
                  variant="primary"
                  className="flex-1 sm:min-w-[140px]"
                  loading={saving}
                  disabled={hasCertificates && !certificatesReviewed}
                  onClick={() => void handleSaveRates(true)}
                >
                  Approve with rates
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 border-rose-200 text-brand-red hover:bg-rose-50 sm:min-w-[100px]"
                  loading={saving}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
              </>
            )}
            {!isPending && (
              <Button
                variant="primary"
                className="flex-1 sm:min-w-[120px]"
                loading={saving}
                onClick={() => void handleSaveRates(false)}
              >
                Save rates
              </Button>
            )}
            {isPending && (
              <Button
                variant="secondary"
                className="flex-1 sm:min-w-[120px]"
                loading={saving}
                onClick={() => void handleSaveRates(false)}
              >
                Save rates only
              </Button>
            )}
            <Button variant="secondary" className="flex-1 sm:min-w-[80px]" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={rejectOpen}
        title={`Reject ${teacher.name}'s application?`}
        message="The applicant will receive an email notification. They will not be able to sign in as an examiner."
        confirmLabel="Reject application"
        tone="danger"
        onConfirm={() => void handleReject()}
        onCancel={() => setRejectOpen(false)}
      />
    </>
  );
}
