"use client";

import { CheckCircle2 } from "lucide-react";
import { useTeacherProfile } from "@/contexts/teacher-profile-context";

export function PerformanceCard() {
  const { profile } = useTeacherProfile();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-semibold text-navy">Performance Overview</h2>

      <ul className="mt-5 space-y-4">
        {profile.performance.map((metric) => (
          <li key={metric.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{metric.label}</span>
              <span className="font-bold text-navy">{metric.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${metric.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SecurityCard() {
  const { profile } = useTeacherProfile();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-semibold text-navy">Account Security</h2>

      <ul className="mt-4 space-y-3">
        {profile.security.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
          >
            <span className="text-sm text-muted">{item.label}</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              {item.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
