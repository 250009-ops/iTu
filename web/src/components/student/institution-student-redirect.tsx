"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api/auth";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
    </div>
  );
}

/**
 * Blocks the B2C student shell until we confirm the user is not a centre-scoped
 * student. Centre members are redirected to `/inst-student` without flashing
 * the marketplace dashboard.
 */
export function InstitutionStudentRedirect({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getMe()
      .then((user) => {
        if (cancelled) return;
        if (user.role === "student" && user.institution != null) {
          router.replace("/inst-student");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return <FullScreenSpinner />;
  }

  return <>{children}</>;
}
