"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { InstitutionAccessLocked } from "@/components/institution/institution-access-locked";
import { useAuth } from "@/hooks/use-auth";
import { getMe, type ApiUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { isOfflineDemoToken } from "@/lib/auth/demo-auth";
import {
  clearSession,
  getDashboardPath,
  type UserRole,
} from "@/lib/auth/session";
import { isDesktopShell } from "@/lib/desktop/shim";

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

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 0;
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("cannot reach")
    );
  }
  return false;
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
  const [networkBlocked, setNetworkBlocked] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

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
        setNetworkBlocked(false);
        setMe(user);
        setValidated(true);
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep the local session on transient network loss so desktop/browser
        // users can continue where they left off after reconnecting.
        if (isNetworkFailure(err) || navigator.onLine === false) {
          setNetworkBlocked(true);
          setValidated(false);
          return;
        }
        clearSession();
        router.replace(`${loginPath}?reason=session_expired`);
      });

    return () => {
      cancelled = true;
    };
  }, [
    allowedRoles,
    isAuthenticated,
    isHydrated,
    loginPath,
    retryToken,
    router,
    session,
  ]);

  useEffect(() => {
    if (!networkBlocked) return;
    function onOnline() {
      setRetryToken((n) => n + 1);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [networkBlocked]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (networkBlocked && isAuthenticated && session) {
    const desktop = isDesktopShell();
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        <div className="max-w-md space-y-2">
          <h1 className="text-lg font-semibold text-navy">
            Reconnecting to iTestU
          </h1>
          <p className="text-sm text-muted">
            {desktop
              ? "No internet right now. Your session is kept — reconnect and you can continue where you left off."
              : "Cannot reach the server. Check your connection. Your sign-in is kept until we can verify it again."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRetryToken((n) => n + 1)}
          className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!validated) {
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
