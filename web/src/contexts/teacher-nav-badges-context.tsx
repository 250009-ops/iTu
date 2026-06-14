"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { getTeacherDashboard } from "@/lib/api/teachers";
import { getWritingQueue } from "@/lib/api/grading";

type TeacherNavBadges = {
  speaking: number;
  writing: number;
};

const TeacherNavBadgesContext = createContext<TeacherNavBadges>({
  speaking: 0,
  writing: 0,
});

export function TeacherNavBadgesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const dashboard = useApiQuery(getTeacherDashboard, [session?.accessToken]);
  const queue = useApiQuery(getWritingQueue, [session?.accessToken]);

  const value = useMemo<TeacherNavBadges>(() => {
    const speaking = dashboard.data?.stats.sessionsToday ?? 0;
    const writing =
      queue.data?.filter((item) => item.status?.toLowerCase() !== "graded")
        .length ??
      dashboard.data?.stats.writingQueue ??
      0;

    return { speaking, writing };
  }, [dashboard.data, queue.data]);

  return (
    <TeacherNavBadgesContext.Provider value={value}>
      {children}
    </TeacherNavBadgesContext.Provider>
  );
}

export function useTeacherNavBadges() {
  return useContext(TeacherNavBadgesContext);
}
