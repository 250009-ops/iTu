"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getWritingQueue } from "@/lib/api/grading";
import { mapGradingSummary } from "@/lib/api/mappers/teacher";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";

type TeacherGradingValue = {
  loading: boolean;
  error: string | null;
  gradingSummary: {
    pendingGrading: number;
    inReview: number;
  };
  submissions: ReturnType<typeof mapGradingSummary>["submissions"];
};

const TeacherGradingContext = createContext<TeacherGradingValue | null>(null);

export function TeacherGradingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { data, loading, error } = useApiQuery(getWritingQueue, [
    session?.accessToken,
  ]);

  const value = useMemo<TeacherGradingValue>(() => {
    const mapped = data ? mapGradingSummary(data) : null;
    return {
      loading,
      error,
      gradingSummary: {
        pendingGrading: mapped?.pendingGrading ?? 0,
        inReview: mapped?.inReview ?? 0,
      },
      submissions: mapped?.submissions ?? [],
    };
  }, [data, loading, error]);

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
