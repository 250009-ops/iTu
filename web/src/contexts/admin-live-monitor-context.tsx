"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getLiveSessions } from "@/lib/api/admin";
import {
  mapLiveMonitorMeta,
  mapLiveSessions,
  mapMonitorSummary,
} from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import { useSseStream } from "@/hooks/use-sse-stream";
import type { LiveSessionRow } from "@/lib/admin/types";

type LiveMonitorValue = {
  loading: boolean;
  error: string | null;
  liveSessions: LiveSessionRow[];
  meta: ReturnType<typeof mapLiveMonitorMeta>;
  monitorSummary: ReturnType<typeof mapMonitorSummary>;
  refresh: () => Promise<void>;
};

type LiveSessions = Awaited<ReturnType<typeof getLiveSessions>>;

const AdminLiveMonitorContext = createContext<LiveMonitorValue | null>(null);

export function AdminLiveMonitorProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getLiveSessions);
  const [streamSessions, setStreamSessions] = useState<LiveSessions | null>(null);

  const applySnapshot = useCallback((sessions: LiveSessions) => {
    setStreamSessions(sessions);
  }, []);

  useSseStream("/admin/sessions/live/stream", {
    onMessage: (payload) => {
      const msg = payload as {
        type?: string;
        sessions?: LiveSessions;
      };
      if (msg.type === "snapshot" && Array.isArray(msg.sessions)) {
        applySnapshot(msg.sessions);
      }
    },
    onError: () => {
      void refresh();
    },
  });

  const value = useMemo<LiveMonitorValue>(() => {
    const source = streamSessions ?? data;
    const liveSessions = source ? mapLiveSessions(source) : [];
    const meta = mapLiveMonitorMeta(liveSessions);
    return {
      loading: loading && !source,
      error,
      liveSessions,
      meta,
      monitorSummary: mapMonitorSummary(meta),
      refresh,
    };
  }, [data, streamSessions, loading, error, refresh]);

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
