"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { getAdminDisputes, updateTicket } from "@/lib/api/admin";
import { mapDisputes } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Ticket } from "@/lib/admin/types";

const POLL_MS = 20_000;

type DisputesValue = {
  loading: boolean;
  error: string | null;
  tickets: Ticket[];
  summary: ReturnType<typeof mapDisputes>["summary"];
  ticketsByType: ReturnType<typeof mapDisputes>["ticketsByType"];
  resolveTicket: (id: string) => Promise<void>;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
};

const AdminDisputesContext = createContext<DisputesValue | null>(null);

export function AdminDisputesProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getAdminDisputes);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const resolveTicket = useCallback(
    async (id: string) => {
      await updateTicket(id, { status: "RESOLVED" });
      await refresh({ silent: true });
    },
    [refresh],
  );

  const value = useMemo<DisputesValue>(() => {
    const mapped = data ? mapDisputes(data) : null;
    return {
      loading,
      error,
      tickets: mapped?.tickets ?? [],
      summary: mapped?.summary ?? {
        openTickets: 0,
        urgentOpen: 0,
        inProgress: 0,
        resolvedThisMonth: 0,
        slaBreached: 0,
      },
      ticketsByType: mapped?.ticketsByType ?? [],
      resolveTicket,
      refresh,
    };
  }, [data, loading, error, resolveTicket, refresh]);

  return (
    <AdminDisputesContext.Provider value={value}>
      {children}
    </AdminDisputesContext.Provider>
  );
}

export function useAdminDisputes() {
  const ctx = useContext(AdminDisputesContext);
  if (!ctx) {
    throw new Error("useAdminDisputes requires AdminDisputesProvider");
  }
  return ctx;
}
