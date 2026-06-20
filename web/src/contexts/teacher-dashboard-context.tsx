"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getTeacherDashboard } from "@/lib/api/teachers";
import { getSpeakingQueue, getWritingQueue } from "@/lib/api/grading";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  mapSpeakingSchedule,
  mapSpeakingQueue,
  mapTeacherStats,
  mapWritingQueue,
} from "@/lib/api/mappers/teacher";
import { useAuth } from "@/hooks/use-auth";
import { displayFirstName } from "@/lib/auth/display-name";

type TeacherDashboardValue = {
  loading: boolean;
  error: string | null;
  teacherUser: { name: string; shortName: string; initials: string; role: string };
  teacherStats: ReturnType<typeof mapTeacherStats>;
  speakingSchedule: ReturnType<typeof mapSpeakingSchedule>;
  writingQueue: ReturnType<typeof mapWritingQueue>;
  speakingQueue: ReturnType<typeof mapSpeakingQueue>;
};

const TeacherDashboardContext = createContext<TeacherDashboardValue | null>(null);

export function TeacherDashboardProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const dashboard = useApiQuery(getTeacherDashboard, [session?.accessToken]);
  const queue = useApiQuery(getWritingQueue, [session?.accessToken]);
  const speakingQueue = useApiQuery(getSpeakingQueue, [session?.accessToken]);

  const value = useMemo<TeacherDashboardValue>(() => {
    const name = session?.name ?? "Teacher";
    return {
      loading: dashboard.loading || queue.loading || speakingQueue.loading,
      error: dashboard.error ?? queue.error ?? speakingQueue.error,
      teacherUser: {
        name,
        shortName: displayFirstName(name),
        initials: name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        role: "Teacher",
      },
      teacherStats: dashboard.data ? mapTeacherStats(dashboard.data) : [],
      speakingSchedule: dashboard.data
        ? mapSpeakingSchedule(dashboard.data)
        : [],
      writingQueue: queue.data ? mapWritingQueue(queue.data) : [],
      speakingQueue: speakingQueue.data ? mapSpeakingQueue(speakingQueue.data) : [],
    };
  }, [dashboard, queue, speakingQueue, session?.name]);

  return (
    <TeacherDashboardContext.Provider value={value}>
      {children}
    </TeacherDashboardContext.Provider>
  );
}

export function useTeacherDashboard() {
  const ctx = useContext(TeacherDashboardContext);
  if (!ctx) {
    throw new Error("useTeacherDashboard requires TeacherDashboardProvider");
  }
  return ctx;
}
