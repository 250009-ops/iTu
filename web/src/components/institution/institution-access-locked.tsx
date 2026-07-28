"use client";

import { Building2, LogOut, Mail } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth/session";

const STATUS_COPY: Record<
  string,
  { title: string; body: string }
> = {
  suspended: {
    title: "Centre account suspended",
    body: "Your Edu Center portal access is paused. Contact iTestU support to restore access.",
  },
  pending: {
    title: "Application under review",
    body: "Your centre application is still being reviewed. We will email you when it is approved.",
  },
  rejected: {
    title: "Application not approved",
    body: "This centre application was not approved. Contact support if you believe this is a mistake.",
  },
};

type InstitutionAccessLockedProps = {
  status?: string | null;
  message?: string | null;
};

export function InstitutionAccessLocked({
  status,
  message,
}: InstitutionAccessLockedProps) {
  const normalized = (status ?? "").toLowerCase();
  const copy = STATUS_COPY[normalized] ?? {
    title: "Centre access unavailable",
    body:
      message?.trim() ||
      "Your centre account is not active. Contact support@itestu.uz for help.",
  };

  function signOut() {
    clearSession();
    window.location.assign("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
        <Logo className="mx-auto h-8" />
        <div className="mt-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-navy">{copy.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{copy.body}</p>
          <a
            href="mailto:support@itestu.uz"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-red hover:underline"
          >
            <Mail className="h-4 w-4" />
            support@itestu.uz
          </a>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-6"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
