"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useTeacherProfile } from "@/contexts/teacher-profile-context";
import { cn } from "@/lib/utils";

export function PerformanceCard() {
  const { profile } = useTeacherProfile();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-semibold text-navy">Performance Overview</h2>

      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {profile.performance.map((metric) => (
          <li
            key={metric.label}
            className="rounded-lg border border-border bg-slate-50/60 px-4 py-3"
          >
            <p className="text-xs font-medium text-muted">{metric.label}</p>
            <p className="mt-1 text-lg font-bold text-navy">{metric.value}</p>
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
            <span
              className={cn(
                "flex items-center gap-1 text-sm font-semibold",
                item.active ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {item.active ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <CircleAlert className="h-4 w-4" />
              )}
              {item.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
