"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminLiveMonitor } from "@/contexts/admin-live-monitor-context";

type SessionDeepLinkProps = {
  onOpenSession: (sessionCode: string) => void;
};

export function SessionDeepLink({ onOpenSession }: SessionDeepLinkProps) {
  const searchParams = useSearchParams();
  const { liveSessions, loading } = useAdminLiveMonitor();
  const sessionCode = searchParams.get("session");

  useEffect(() => {
    if (!sessionCode || loading) return;
    const match = liveSessions.some((s) => s.sessionCode === sessionCode);
    if (match) {
      onOpenSession(sessionCode);
    }
  }, [sessionCode, loading, liveSessions, onOpenSession]);

  return null;
}
