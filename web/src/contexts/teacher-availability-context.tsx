"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getTeacherAvailability } from "@/lib/api/teachers";
import {
  getWeekMonday,
  mapTeacherAvailability,
} from "@/lib/api/mappers/teacher";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";

type TeacherAvailabilityValue = {
  loading: boolean;
  error: string | null;
  availability: ReturnType<typeof mapTeacherAvailability>;
  weekOffset: number;
  setWeekOffset: (offset: number | ((prev: number) => number)) => void;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
};

const emptyAvailability = mapTeacherAvailability({
  slotDuration: 20,
  bufferMinutes: 0,
  weekStart: getWeekMonday(new Date()).toISOString(),
  weekly: [],
  slots: [],
  upcoming: [],
});

const TeacherAvailabilityContext =
  createContext<TeacherAvailabilityValue | null>(null);

export function TeacherAvailabilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const monday = getWeekMonday(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday.toISOString();
  }, [weekOffset]);

  const fetchAvailability = useCallback(
    () => getTeacherAvailability(weekStart),
    [weekStart],
  );

  const { data, loading, error, refresh } = useApiQuery(fetchAvailability, [
    session?.accessToken,
    weekStart,
  ]);

  const value = useMemo<TeacherAvailabilityValue>(
    () => ({
      loading,
      error,
      weekOffset,
      setWeekOffset,
      availability: data
        ? mapTeacherAvailability(data, weekOffset)
        : emptyAvailability,
      refresh,
    }),
    [data, loading, error, refresh, weekOffset],
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
