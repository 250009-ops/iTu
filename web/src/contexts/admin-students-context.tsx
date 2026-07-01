"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  getAdminStudents,
  grantEnrollment,
  revokeAdminGrant,
  updateAdminGrant,
} from "@/lib/api/admin";
import type {
  GrantEnrollmentBody,
  UpdateGrantEnrollmentBody,
} from "@/lib/api/admin";
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
  updateGrant: (
    enrollmentId: string,
    payload: UpdateGrantEnrollmentBody,
  ) => ReturnType<typeof updateAdminGrant>;
  revokeGrant: (enrollmentId: string) => ReturnType<typeof revokeAdminGrant>;
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

  const updateGrant = useCallback(
    async (enrollmentId: string, payload: UpdateGrantEnrollmentBody) => {
      const result = await updateAdminGrant(enrollmentId, payload);
      await refresh();
      return result;
    },
    [refresh],
  );

  const revokeGrant = useCallback(
    async (enrollmentId: string) => {
      const result = await revokeAdminGrant(enrollmentId);
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
      updateGrant,
      revokeGrant,
      refresh,
    }),
    [loading, error, mapped, grant, updateGrant, revokeGrant, refresh],
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
