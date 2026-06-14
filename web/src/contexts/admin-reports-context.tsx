"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getAdminReports } from "@/lib/api/admin";
import { mapReports } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";

type ReportsValue = ReturnType<typeof mapReports> & {
  loading: boolean;
  error: string | null;
};

const AdminReportsContext = createContext<ReportsValue | null>(null);

const emptyReports = mapReports({
  funnel: [],
  revenue: { total: 0, orderCount: 0 },
  teacherLeaderboard: [],
});

export function AdminReportsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useApiQuery(getAdminReports);

  const value = useMemo<ReportsValue>(() => {
    const mapped = data ? mapReports(data) : emptyReports;
    return { ...mapped, loading, error };
  }, [data, loading, error]);

  return (
    <AdminReportsContext.Provider value={value}>
      {children}
    </AdminReportsContext.Provider>
  );
}

export function useAdminReports() {
  const ctx = useContext(AdminReportsContext);
  if (!ctx) {
    throw new Error("useAdminReports requires AdminReportsProvider");
  }
  return ctx;
}
