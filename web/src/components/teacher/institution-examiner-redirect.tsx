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
 * Legacy `/teacher/*` deep links are rewritten to `/inst-examiner/*` equivalents
 * so grading submit / speaking return paths never bounce to a dead marketplace hub.
 */
function rewriteCentreTeacherPath(
  pathname: string,
  search: string,
): string {
  if (pathname === "/teacher" || pathname === "/teacher/dashboard") {
    return "/inst-examiner";
  }
  if (pathname === "/teacher/grading" || pathname.startsWith("/teacher/grading/")) {
    return `${pathname.replace("/teacher/grading", "/inst-examiner/grading")}${search}`;
  }
  if (
    pathname === "/teacher/speaking" ||
    pathname.startsWith("/teacher/speaking/")
  ) {
    return `/inst-examiner/speaking${search}`;
  }
  if (pathname === "/teacher/writing") {
    return "/inst-examiner/grading";
  }
  if (pathname.startsWith("/teacher/")) {
    return "/inst-examiner";
  }
  return "/inst-examiner";
}

export function InstitutionExaminerRedirect({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const search =
      typeof window !== "undefined" ? window.location.search : "";

    void getMe()
      .then((user) => {
        if (cancelled) return;
        if (user.role === "teacher" && user.institution != null) {
          router.replace(rewriteCentreTeacherPath(pathname, search));
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
