"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getWritingGradingHub } from "@/lib/api/grading";
import { mapWritingGradingHub } from "@/lib/api/mappers/teacher";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";

const emptyHub = mapWritingGradingHub({
  pending: [],
  inReview: [],
  completed: [],
  counts: { pending: 0, inReview: 0, completed: 0 },
  stats: {
    pendingGrading: 0,
    onTimeSlaPercent: 100,
    overdueCount: 0,
    gradedThisPeriod: 0,
  },
});

type TeacherGradingValue = {
  loading: boolean;
  error: string | null;
  hub: ReturnType<typeof mapWritingGradingHub>;
  refresh: () => Promise<void>;
};

const TeacherGradingContext = createContext<TeacherGradingValue | null>(null);

export function TeacherGradingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { data, loading, error, refresh } = useApiQuery(getWritingGradingHub, [
    session?.accessToken,
  ]);

  const value = useMemo<TeacherGradingValue>(
    () => ({
      loading,
      error,
      hub: data ? mapWritingGradingHub(data) : emptyHub,
      refresh,
    }),
    [data, loading, error, refresh],
  );

  return (
    <TeacherGradingContext.Provider value={value}>
      {children}
    </TeacherGradingContext.Provider>
  );
}

export function useTeacherGrading() {
  const ctx = useContext(TeacherGradingContext);
  if (!ctx) {
    throw new Error("useTeacherGrading requires TeacherGradingProvider");
  }
  return ctx;
}
