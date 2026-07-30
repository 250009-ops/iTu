"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getAdminTeachers, updateTeacherStatus } from "@/lib/api/admin";
import { mapTeachers } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Examiner, TeacherStatus } from "@/lib/admin/types";

type TeachersValue = {
  loading: boolean;
  error: string | null;
  examiners: Examiner[];
  summary: ReturnType<typeof mapTeachers>["summary"];
  updateStatus: (id: string, status: TeacherStatus) => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminTeachersContext = createContext<TeachersValue | null>(null);

export function AdminTeachersProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getAdminTeachers);
  const [localExaminers, setLocalExaminers] = useState<Examiner[] | null>(null);

  const mapped = useMemo(() => (data ? mapTeachers(data) : null), [data]);

  const examiners = localExaminers ?? mapped?.examiners ?? [];

  const refreshTeachers = useCallback(async () => {
    await refresh();
    // Drop optimistic overrides so the latest API list wins (e.g. after
    // Approve with rates, which does not go through updateStatus).
    setLocalExaminers(null);
  }, [refresh]);

  const updateStatus = useCallback(
    async (id: string, status: TeacherStatus) => {
      await updateTeacherStatus(id, status);
      setLocalExaminers((prev) => {
        const base = prev ?? mapped?.examiners ?? [];
        return base.map((t) => (t.id === id ? { ...t, status } : t));
      });
      await refreshTeachers();
    },
    [mapped?.examiners, refreshTeachers],
  );

  const value = useMemo<TeachersValue>(
    () => ({
      loading,
      error,
      examiners,
      summary: mapped?.summary ?? {
        total: 0,
        approved: 0,
        pendingReview: 0,
        suspended: 0,
      },
      updateStatus,
      refresh: refreshTeachers,
    }),
    [loading, error, examiners, mapped?.summary, updateStatus, refreshTeachers],
  );

  return (
    <AdminTeachersContext.Provider value={value}>
      {children}
    </AdminTeachersContext.Provider>
  );
}

export function useAdminTeachers() {
  const ctx = useContext(AdminTeachersContext);
  if (!ctx) {
    throw new Error("useAdminTeachers requires AdminTeachersProvider");
  }
  return ctx;
}
