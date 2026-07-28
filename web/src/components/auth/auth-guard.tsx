"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { InstitutionAccessLocked } from "@/components/institution/institution-access-locked";
import { useAuth } from "@/hooks/use-auth";
import { getMe, type ApiUser } from "@/lib/api/auth";
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

function isInstitutionPortalLocked(user: ApiUser): boolean {
  if (user.role !== "institution") return false;
  const status = user.institution?.status?.toLowerCase();
  return Boolean(status && status !== "active");
}

export function AuthGuard({
  children,
  allowedRoles,
  loginPath = "/login",
}: AuthGuardProps) {
  const router = useRouter();
  const { session, isAuthenticated, isHydrated } = useAuth();
  const [validated, setValidated] = useState(false);
  const [me, setMe] = useState<ApiUser | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !session) {
      router.replace(loginPath);
      return;
    }

    if (!allowedRoles.includes(session.role)) {
      router.replace(
        getDashboardPath(session.role, {
          institutionLinked: session.institutionLinked,
        }),
      );
      return;
    }

    if (isOfflineDemoToken(session.accessToken)) {
      clearSession();
      router.replace(`${loginPath}?reason=session_expired`);
      return;
    }

    let cancelled = false;

    void getMe(session.accessToken)
      .then((user) => {
        if (cancelled) return;
        setMe(user);
        setValidated(true);
      })
      .catch(() => {
        if (!cancelled) {
          // 401 usually triggers global redirect via apiFetch; this is a fallback.
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

  if (me && isInstitutionPortalLocked(me)) {
    return <InstitutionAccessLocked status={me.institution?.status} />;
  }

  if (!session || !allowedRoles.includes(session.role)) {
    return null;
  }

  return <>{children}</>;
}
