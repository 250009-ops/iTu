"use client";

import { CheckCircle2 } from "lucide-react";
import { useTeacherProfile } from "@/contexts/teacher-profile-context";
import { useProfilePortal } from "@/contexts/profile-portal-context";

export function CredentialsCard() {
  const { profile } = useTeacherProfile();
  const { variant, centerName } = useProfilePortal();
  const isCentre = variant === "centre";

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-semibold text-navy">Professional Credentials</h2>
        <p className="mt-0.5 text-sm text-muted">
          {isCentre
            ? `Qualifications on file for your ${centerName ?? "centre"} examiner role`
            : "Qualifications verified by IELTS Mock platform"}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {profile.credentials.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-slate-50 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {field.label}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-navy">
                {field.value}
              </p>
            </div>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
