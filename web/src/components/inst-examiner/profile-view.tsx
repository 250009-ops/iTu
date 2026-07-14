"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Star } from "lucide-react";
import { useInstExaminer } from "@/contexts/inst-examiner-context";
import {
  getTeacherProfile,
  updateTeacherProfile,
  type TeacherProfileResponse,
} from "@/lib/api/teachers";
import { getErrorMessage } from "@/lib/api/errors";
import { PageHeader } from "@/components/institution/ui";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy shadow-sm outline-none transition-colors placeholder:text-muted focus:border-navy focus:ring-2 focus:ring-navy/10";
const readonlyClass =
  "w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function memberSinceLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function InstExaminerProfileView() {
  const { info } = useInstExaminer();
  const centerName = info?.center?.name ?? "your center";

  const [profile, setProfile] = useState<TeacherProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [speciality, setSpeciality] =
    useState<"writing" | "speaking" | "both">("both");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTeacherProfile()
      .then((res) => {
        if (cancelled) return;
        setProfile(res);
        setName(res.name);
        setBio(res.bio ?? "");
        if (
          res.speciality === "writing" ||
          res.speciality === "speaking" ||
          res.speciality === "both"
        ) {
          setSpeciality(res.speciality);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(getErrorMessage(err, "Could not load your profile."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateTeacherProfile({ name, bio, speciality });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save your changes."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const stats = [
    {
      label: "Rating",
      value: profile.rating != null ? profile.rating.toFixed(1) : "—",
      icon: true,
    },
    { label: "Sessions", value: profile.totalSessions },
    { label: "Reviews", value: profile.reviewCount },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        breadcrumb="Examiner Portal › Examiner Profile"
        title="Examiner Profile"
        description={`Scoped to ${centerName}`}
      />

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-navy px-6 py-6 text-white sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold">
              {initials(profile.name)}
            </span>
            <div>
              <h2 className="text-xl font-bold">{profile.name}</h2>
              <p className="text-sm text-slate-300">{profile.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-violet-200 ring-1 ring-inset ring-violet-400/30">
                  IELTS Certified
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200 ring-1 ring-inset ring-white/15">
                  <ShieldCheck className="h-3 w-3" /> Scoped Examiner
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="flex items-center justify-center gap-1 text-2xl font-bold">
                  {s.icon && (
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  )}
                  {s.value}
                </p>
                <p className="text-[11px] text-slate-300">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[11px] text-slate-400">
          Joined {centerName} · {memberSinceLabel(profile.memberSince)}
        </p>
      </div>

      {/* Earnings managed by centre */}
      <div className="flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-navy">
              Earnings managed by {centerName}
            </p>
            <p className="mt-0.5">
              As a scoped examiner, your payout schedule and invoicing are handled
              directly by {centerName}. Contact your centre coordinator for
              payment inquiries or scheduling changes.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Managed by centre
        </span>
      </div>

      {/* Professional information */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-bold text-navy">Professional Information</h3>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="ie-name">
              Full Name
            </label>
            <input
              id="ie-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ie-email">
              Email Address
            </label>
            <input
              id="ie-email"
              className={readonlyClass}
              value={profile.email}
              readOnly
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="ie-speciality">
              Speciality
            </label>
            <select
              id="ie-speciality"
              className={inputClass}
              value={speciality}
              onChange={(e) =>
                setSpeciality(
                  e.target.value as "writing" | "speaking" | "both",
                )
              }
            >
              <option value="both">Writing &amp; Speaking</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Languages Spoken</label>
            <div className="flex min-h-[2.4rem] flex-wrap items-center gap-1.5 rounded-lg border border-border bg-slate-50 px-3 py-2">
              {profile.languages.length > 0 ? (
                profile.languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-medium text-navy ring-1 ring-inset ring-border"
                  >
                    {lang}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">Managed by centre</span>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="ie-bio">
              Bio / Teaching Approach
            </label>
            <textarea
              id="ie-bio"
              className={cn(inputClass, "min-h-[110px] resize-y")}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell centre students about your examining experience…"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs font-semibold text-emerald-600">
              Changes saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
