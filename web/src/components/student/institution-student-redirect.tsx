"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api/auth";

/**
 * Safety net for the B2C student portal: a STUDENT linked to an institution
 * belongs to the center-scoped `/inst-student` portal. Logins already route
 * correctly, so this only catches manual navigation to `/student`.
 */
export function InstitutionStudentRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void getMe()
      .then((user) => {
        if (cancelled) return;
        if (user.role === "student" && user.institution != null) {
          router.replace("/inst-student");
        }
      })
      .catch(() => {
        // Non-blocking — AuthGuard handles auth failures.
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
