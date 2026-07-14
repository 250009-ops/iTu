"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe } from "@/lib/api/auth";

/**
 * Safety net for the marketplace teacher portal: a TEACHER linked to an
 * institution belongs to the center-scoped `/inst-examiner` portal. Logins
 * already route correctly, so this catches manual navigation to `/teacher`.
 *
 * The actual grading consoles (`/teacher/speaking`, `/teacher/grading/<id>`)
 * are reused by the scoped portal via deep links, so those routes are exempt.
 */
export function InstitutionExaminerRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isConsole =
      pathname.startsWith("/teacher/grading/") ||
      pathname.startsWith("/teacher/speaking");
    if (isConsole) return;

    let cancelled = false;
    void getMe()
      .then((user) => {
        if (cancelled) return;
        if (user.role === "teacher" && user.institution != null) {
          router.replace("/inst-examiner");
        }
      })
      .catch(() => {
        // Non-blocking — AuthGuard handles auth failures.
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return null;
}
