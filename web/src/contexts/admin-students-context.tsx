"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { getAdminStudents, grantEnrollment } from "@/lib/api/admin";
import type { GrantEnrollmentBody } from "@/lib/api/admin";
import { mapStudents } from "@/lib/api/mappers/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Student } from "@/lib/admin/types";

type StudentsValue = {
  loading: boolean;
  error: string | null;
  students: Student[];
  summary: ReturnType<typeof mapStudents>["summary"];
  grant: (
    payload: GrantEnrollmentBody,
  ) => ReturnType<typeof grantEnrollment>;
  refresh: () => Promise<void>;
};

const AdminStudentsContext = createContext<StudentsValue | null>(null);

export function AdminStudentsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getAdminStudents);

  const mapped = useMemo(() => (data ? mapStudents(data) : null), [data]);

  const grant = useCallback(
    async (payload: GrantEnrollmentBody) => {
      const result = await grantEnrollment(payload);
      await refresh();
      return result;
    },
    [refresh],
  );

  const value = useMemo<StudentsValue>(
    () => ({
      loading,
      error,
      students: mapped?.students ?? [],
      summary: mapped?.summary ?? {
        total: 0,
        verified: 0,
        enrolled: 0,
        awaitingFirstMock: 0,
      },
      grant,
      refresh,
    }),
    [loading, error, mapped, grant, refresh],
  );

  return (
    <AdminStudentsContext.Provider value={value}>
      {children}
    </AdminStudentsContext.Provider>
  );
}

export function useAdminStudents() {
  const ctx = useContext(AdminStudentsContext);
  if (!ctx) {
    throw new Error("useAdminStudents requires AdminStudentsProvider");
  }
  return ctx;
}
