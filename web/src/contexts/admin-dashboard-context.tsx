"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getAdminDashboard } from "@/lib/api/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  mapAdminStats,
  mapCompletionRates,
  mapDashboardMeta,
  mapLiveSessions,
  mapMonthlyRevenue,
} from "@/lib/api/mappers/admin";
import type { LiveSessionRow } from "@/lib/admin/types";

type AdminDashboardValue = {
  loading: boolean;
  error: string | null;
  adminStats: ReturnType<typeof mapAdminStats>;
  liveSessions: LiveSessionRow[];
  monthlyRevenue: ReturnType<typeof mapMonthlyRevenue>;
  completionRates: ReturnType<typeof mapCompletionRates>;
  meta: {
    date: string;
    status: string;
    lastSync: string;
    disputeAlert: string | null;
  };
};

const AdminDashboardContext = createContext<AdminDashboardValue | null>(null);

export function AdminDashboardProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useApiQuery(getAdminDashboard);

  const value = useMemo<AdminDashboardValue>(() => {
    const liveSessions = data?.liveSessions
      ? mapLiveSessions(data.liveSessions)
      : [];
    const openTickets = data?.kpis.openTickets ?? 0;

    return {
      loading,
      error,
      adminStats: data ? mapAdminStats(data) : [],
      liveSessions,
      monthlyRevenue: data ? mapMonthlyRevenue(data.monthlyRevenue) : [],
      completionRates: data
        ? mapCompletionRates(data.completionRates)
        : mapCompletionRates([]),
      meta: {
        date: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        ...(data
          ? mapDashboardMeta(data.meta)
          : { status: "Platform operational", lastSync: "Just now" }),
        disputeAlert:
          openTickets > 0
            ? `${openTickets} dispute${openTickets > 1 ? "s" : ""} need attention`
            : null,
      },
    };
  }, [data, loading, error]);

  return (
    <AdminDashboardContext.Provider value={value}>
      {children}
    </AdminDashboardContext.Provider>
  );
}

export function useAdminDashboard() {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) {
    throw new Error("useAdminDashboard requires AdminDashboardProvider");
  }
  return ctx;
}
