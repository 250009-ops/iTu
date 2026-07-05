"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getTeacherEarnings } from "@/lib/api/teachers";
import { mapTeacherEarnings } from "@/lib/api/mappers/teacher";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";

type TeacherEarningsValue = {
  loading: boolean;
  error: string | null;
  earnings: ReturnType<typeof mapTeacherEarnings>;
  refresh: () => Promise<void>;
};

const emptyEarnings = mapTeacherEarnings({
  totalEarned: 0,
  totalSessions: 0,
  commissionRate: 0,
  speakingRate: 25,
  writingRate: 35,
  pendingBalance: 0,
  payoutSchedule: "weekly",
  payoutDetails: null,
  payouts: [],
});

const TeacherEarningsContext = createContext<TeacherEarningsValue | null>(null);

export function TeacherEarningsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { data, loading, error, refresh } = useApiQuery(getTeacherEarnings, [
    session?.accessToken,
  ]);

  const value = useMemo<TeacherEarningsValue>(
    () => ({
      loading,
      error,
      earnings: data ? mapTeacherEarnings(data) : emptyEarnings,
      refresh,
    }),
    [data, loading, error, refresh],
  );

  return (
    <TeacherEarningsContext.Provider value={value}>
      {children}
    </TeacherEarningsContext.Provider>
  );
}

export function useTeacherEarnings() {
  const ctx = useContext(TeacherEarningsContext);
  if (!ctx) {
    throw new Error("useTeacherEarnings requires TeacherEarningsProvider");
  }
  return ctx;
}
