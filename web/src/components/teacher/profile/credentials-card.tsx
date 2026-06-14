"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import { useTeacherProfile } from "@/contexts/teacher-profile-context";
import { useToast } from "@/components/ui/toast";

export function CredentialsCard() {
  const { profile } = useTeacherProfile();
  const { toast } = useToast();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-navy">Professional Credentials</h2>
          <p className="mt-0.5 text-sm text-muted">
            Qualifications verified by IELTS Mock platform
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toast("Edit credentials", {
              description: "Submit updated qualifications for verification soon.",
              variant: "info",
            })
          }
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
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
