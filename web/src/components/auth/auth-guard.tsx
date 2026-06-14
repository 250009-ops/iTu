"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMe } from "@/lib/api/auth";
import { isOfflineDemoToken } from "@/lib/auth/demo-auth";
import {
  clearSession,
  getDashboardPath,
  type UserRole,
} from "@/lib/auth/session";

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles: UserRole[];
  loginPath?: string;
};

export function AuthGuard({
  children,
  allowedRoles,
  loginPath = "/login",
}: AuthGuardProps) {
  const router = useRouter();
  const { session, isAuthenticated, isHydrated } = useAuth();
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !session) {
      router.replace(loginPath);
      return;
    }

    if (!allowedRoles.includes(session.role)) {
      router.replace(getDashboardPath(session.role));
      return;
    }

    if (isOfflineDemoToken(session.accessToken)) {
      clearSession();
      router.replace(`${loginPath}?reason=session_expired`);
      return;
    }

    let cancelled = false;

    void getMe(session.accessToken)
      .then(() => {
        if (!cancelled) setValidated(true);
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          router.replace(`${loginPath}?reason=session_expired`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    allowedRoles,
    isAuthenticated,
    isHydrated,
    loginPath,
    router,
    session,
  ]);

  if (!isHydrated || !validated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!session || !allowedRoles.includes(session.role)) {
    return null;
  }

  return <>{children}</>;
}
