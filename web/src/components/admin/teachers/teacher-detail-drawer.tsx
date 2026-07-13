"use client";

import { useEffect, useState } from "react";
import {
  Award,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Phone,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminTeacher } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/errors";
import type { Examiner, TeacherSpeciality, TeacherStatus } from "@/lib/admin/types";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getAdminTeacher>> | null>(
    null,
  );

  useEffect(() => {
    if (!teacher) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getAdminTeacher(teacher.id)
      .then((data) => {
        if (!cancelled) setDetail(data);
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
  }, [teacher]);

  if (!teacher) return null;

  const status = statusStyles[teacher.status];
  const app = detail?.application;
  const languages = Array.isArray(detail?.languages)
    ? (detail.languages as string[])
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
                    status.pill,
                  )}
                >
                  {status.label}
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

              {teacher.status === "pending" && app && (
                <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <Award className="h-4 w-4 text-amber-600" />
                    Application details
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
                    {app.phone && (
                      <div>
                        <dt className="text-xs text-muted">Phone</dt>
                        <dd className="flex items-center gap-1 font-semibold text-navy">
                          <Phone className="h-3.5 w-3.5" />
                          {app.phone}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {app.qualifications?.length ? (
                    <div className="mt-3">
                      <p className="text-xs text-muted">Qualifications</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {app.qualifications.map((q) => (
                          <span
                            key={q}
                            className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-navy ring-1 ring-amber-200"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </aside>
    </>
  );
}
