"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useTeacherProfile } from "@/contexts/teacher-profile-context";
import { useProfilePortal } from "@/contexts/profile-portal-context";
import { cn } from "@/lib/utils";

export function SpecialisationsCard() {
  const { profile } = useTeacherProfile();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-semibold text-navy">Specialisations</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {profile.specialisations.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CentreScopeCard() {
  const { centerName, overview } = useProfilePortal();
  const name = centerName ?? "your centre";

  const rows = [
    {
      label: "Assigned students",
      value: String(overview?.stats.centreStudents ?? 0),
    },
    {
      label: "Active mocks",
      value: String(overview?.stats.activeMocks ?? 0),
    },
    {
      label: "Sessions today",
      value: String(overview?.stats.sessionsToday ?? 0),
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-navy">Centre Scope</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
          <ShieldCheck className="h-3 w-3" />
          Scoped
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Availability and assignments are managed by {name}.
      </p>

      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between rounded-lg border border-border bg-slate-50/60 px-4 py-3 text-sm"
          >
            <span className="text-muted">{row.label}</span>
            <span className="font-semibold text-navy">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AvailabilityCard() {
  const { profile } = useTeacherProfile();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-navy">Availability</h2>
        <Link
          href="/teacher/availability"
          className="flex items-center gap-0.5 text-sm font-semibold text-sky-600 hover:text-sky-700"
        >
          Manage
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <ul className="mt-4 space-y-3">
        {profile.availability.map((slot) => (
          <li
            key={slot.days}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-medium text-navy">{slot.days}</span>
            <span className="flex items-center gap-2 text-muted">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  slot.active ? "bg-emerald-500" : "bg-slate-300",
                )}
              />
              {slot.hours}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
