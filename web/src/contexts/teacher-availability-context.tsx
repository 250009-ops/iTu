"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getTeacherAvailability } from "@/lib/api/teachers";
import { mapTeacherAvailability } from "@/lib/api/mappers/teacher";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";

type TeacherAvailabilityValue = {
  loading: boolean;
  error: string | null;
  availability: ReturnType<typeof mapTeacherAvailability>;
  refresh: () => Promise<void>;
};

const emptyAvailability = mapTeacherAvailability({ weekly: [], slots: [] });

const TeacherAvailabilityContext =
  createContext<TeacherAvailabilityValue | null>(null);

export function TeacherAvailabilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useAuth();
  const { data, loading, error, refresh } = useApiQuery(getTeacherAvailability, [
    session?.accessToken,
  ]);

  const value = useMemo<TeacherAvailabilityValue>(
    () => ({
      loading,
      error,
      availability: data ? mapTeacherAvailability(data) : emptyAvailability,
      refresh,
    }),
    [data, loading, error, refresh],
  );

  return (
    <TeacherAvailabilityContext.Provider value={value}>
      {children}
    </TeacherAvailabilityContext.Provider>
  );
}

export function useTeacherAvailability() {
  const ctx = useContext(TeacherAvailabilityContext);
  if (!ctx) {
    throw new Error(
      "useTeacherAvailability requires TeacherAvailabilityProvider",
    );
  }
  return ctx;
}
