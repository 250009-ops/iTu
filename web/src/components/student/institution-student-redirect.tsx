"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMe } from "@/lib/api/auth";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
    </div>
  );
}

/** Map marketplace student routes onto the centre portal equivalents. */
function institutionPathForStudentRoute(
  pathname: string,
  search: string,
): string {
  if (pathname === "/student/results" || pathname.startsWith("/student/results/")) {
    return `/inst-student/results${search}`;
  }
  if (pathname === "/student/mock-day" || pathname.startsWith("/student/mock-day/")) {
    return `/inst-student/my-mock${search}`;
  }
  if (
    pathname === "/student/notifications" ||
    pathname.startsWith("/student/notifications/")
  ) {
    return `/inst-student/notifications${search}`;
  }
  if (pathname === "/student/help" || pathname.startsWith("/student/help/")) {
    return `/inst-student/help${search}`;
  }
  if (pathname === "/student/profile" || pathname.startsWith("/student/profile/")) {
    return `/inst-student/profile${search}`;
  }
  if (pathname.startsWith("/student/practice")) {
    return pathname.replace(/^\/student/, "/inst-student") + search;
  }
  return "/inst-student";
}

/**
 * Blocks the B2C student shell until we confirm the user is not a centre-scoped
 * student. Centre members are redirected to the matching `/inst-student` route
 * (preserving results enrollment query params) without flashing the marketplace UI.
 */
export function InstitutionStudentRedirect({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getMe()
      .then((user) => {
        if (cancelled) return;
        if (user.role === "student" && user.institution != null) {
          const search =
            typeof window !== "undefined" ? window.location.search : "";
          router.replace(institutionPathForStudentRoute(pathname, search));
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
  }, [pathname, router]);

  if (!ready) {
    return <FullScreenSpinner />;
  }

  return <>{children}</>;
}
