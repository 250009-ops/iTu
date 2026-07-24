"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe } from "@/lib/api/auth";

/**
 * Safety net for the marketplace teacher portal: a TEACHER linked to an
 * institution belongs to the center-scoped `/inst-examiner` portal. Logins
 * already route correctly, so this catches manual navigation to `/teacher`.
 *
 * While checking, do not mount TeacherShell children — that avoids 403 spam from
 * marketplace-only endpoints (availability / speaking-queue) for centre examiners.
 *
 * Legacy deep links to `/teacher/grading/*` and `/teacher/speaking` still work
 * but new centre flows should use `/inst-examiner/*` routes.
 */
export function InstitutionExaminerRedirect({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isConsole =
      pathname.startsWith("/teacher/grading/") ||
      pathname.startsWith("/teacher/speaking");
    if (isConsole) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);
    void getMe()
      .then((user) => {
        if (cancelled) return;
        if (user.role === "teacher" && user.institution != null) {
          router.replace("/inst-examiner");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        // Non-blocking — AuthGuard handles auth failures.
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
