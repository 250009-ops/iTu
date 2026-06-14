"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getDashboardPath } from "@/lib/auth/session";

export function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, isAuthenticated, isHydrated } = useAuth();

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !session) return;
    router.replace(getDashboardPath(session.role));
  }, [isAuthenticated, isHydrated, router, session]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return <>{children}</>;
}
