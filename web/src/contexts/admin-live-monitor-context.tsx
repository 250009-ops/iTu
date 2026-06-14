"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getLiveSessions } from "@/lib/api/admin";
import {
  mapLiveMonitorMeta,
  mapLiveSessions,
  mapMonitorSummary,
} from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { LiveSessionRow } from "@/lib/admin/types";

type LiveMonitorValue = {
  loading: boolean;
  error: string | null;
  liveSessions: LiveSessionRow[];
  meta: ReturnType<typeof mapLiveMonitorMeta>;
  monitorSummary: ReturnType<typeof mapMonitorSummary>;
  refresh: () => Promise<void>;
};

const AdminLiveMonitorContext = createContext<LiveMonitorValue | null>(null);

export function AdminLiveMonitorProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getLiveSessions);

  const value = useMemo<LiveMonitorValue>(() => {
    const liveSessions = data ? mapLiveSessions(data) : [];
    const meta = mapLiveMonitorMeta(liveSessions);
    return {
      loading,
      error,
      liveSessions,
      meta,
      monitorSummary: mapMonitorSummary(meta),
      refresh,
    };
  }, [data, loading, error, refresh]);

  return (
    <AdminLiveMonitorContext.Provider value={value}>
      {children}
    </AdminLiveMonitorContext.Provider>
  );
}

export function useAdminLiveMonitor() {
  const ctx = useContext(AdminLiveMonitorContext);
  if (!ctx) {
    throw new Error("useAdminLiveMonitor requires AdminLiveMonitorProvider");
  }
  return ctx;
}
