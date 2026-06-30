"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getAdminEnrollments } from "@/lib/api/admin";
import { mapEnrollments } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Enrollment } from "@/lib/admin/types";

type EnrollmentsValue = {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  enrollments: Enrollment[];
  summary: ReturnType<typeof mapEnrollments>["summary"];
  lifecyclePipeline: ReturnType<typeof mapEnrollments>["lifecyclePipeline"];
};

const AdminEnrollmentsContext = createContext<EnrollmentsValue | null>(null);

export function AdminEnrollmentsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getAdminEnrollments);

  const value = useMemo<EnrollmentsValue>(() => {
    const mapped = data ? mapEnrollments(data) : null;
    return {
      loading,
      error,
      refresh,
      enrollments: mapped?.enrollments ?? [],
      summary: mapped?.summary ?? {
        total: 0,
        period: "",
        activeExams: 0,
        awaitingResults: 0,
        completed: 0,
      },
      lifecyclePipeline: mapped?.lifecyclePipeline ?? [],
    };
  }, [data, loading, error, refresh]);

  return (
    <AdminEnrollmentsContext.Provider value={value}>
      {children}
    </AdminEnrollmentsContext.Provider>
  );
}

export function useAdminEnrollments() {
  const ctx = useContext(AdminEnrollmentsContext);
  if (!ctx) {
    throw new Error("useAdminEnrollments requires AdminEnrollmentsProvider");
  }
  return ctx;
}
