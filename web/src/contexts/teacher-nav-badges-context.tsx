"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useSseStream } from "@/hooks/use-sse-stream";
import { getTeacherDashboard } from "@/lib/api/teachers";
import { getSpeakingQueue, getWritingQueue } from "@/lib/api/grading";

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
  const writingQueue = useApiQuery(getWritingQueue, [session?.accessToken]);
  const speakingQueue = useApiQuery(getSpeakingQueue, [session?.accessToken]);
  const [streamCounts, setStreamCounts] = useState<{
    speaking: number;
    writing: number;
  } | null>(null);

  useSseStream(session?.accessToken ? "/teachers/nav-badges/stream" : null, {
    enabled: Boolean(session?.accessToken),
    onMessage: (payload) => {
      const msg = payload as {
        type?: string;
        speaking?: number;
        writing?: number;
      };
      if (msg.type === "badges") {
        setStreamCounts({
          speaking: msg.speaking ?? 0,
          writing: msg.writing ?? 0,
        });
      }
    },
  });

  const value = useMemo<TeacherNavBadges>(() => {
    if (streamCounts) return streamCounts;

    const writing =
      writingQueue.data?.filter((item) => item.status?.toLowerCase() !== "graded")
        .length ??
      dashboard.data?.stats.writingQueue ??
      0;
    const speaking =
      speakingQueue.data?.length ?? dashboard.data?.stats.speakingQueue ?? 0;

    return { speaking, writing };
  }, [streamCounts, dashboard.data, writingQueue.data, speakingQueue.data]);

  return (
    <TeacherNavBadgesContext.Provider value={value}>
      {children}
    </TeacherNavBadgesContext.Provider>
  );
}

export function useTeacherNavBadges() {
  return useContext(TeacherNavBadgesContext);
}
