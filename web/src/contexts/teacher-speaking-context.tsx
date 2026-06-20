"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { getSpeakingSession } from "@/lib/api/grading";
import { getSpeakingExaminerContent } from "@/lib/api/speaking";
import { getTeacherSpeakingSessions } from "@/lib/api/teachers";
import {
  mapSpeakingSession,
  mapTeacherSpeakingSessions,
} from "@/lib/api/mappers/teacher";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import type { SpeakingContent } from "@/lib/exam/types";

type TeacherSpeakingValue = {
  hubLoading: boolean;
  hubError: string | null;
  hub: ReturnType<typeof mapTeacherSpeakingSessions>;
  refreshHub: () => Promise<void>;
  sessionId: string | null;
  sessionLoading: boolean;
  sessionError: string | null;
  session: ReturnType<typeof mapSpeakingSession> | null;
  speakingContent: SpeakingContent | null;
  contentLoading: boolean;
  contentError: string | null;
  refreshSession: () => Promise<void>;
};

const emptyHub = mapTeacherSpeakingSessions({
  today: [],
  upcoming: [],
  completed: [],
  counts: { today: 0, upcoming: 0, completed: 0 },
  nextSession: null,
  minutesUntilNext: null,
});

const TeacherSpeakingContext = createContext<TeacherSpeakingValue | null>(null);

export function TeacherSpeakingProvider({ children }: { children: ReactNode }) {
  const { session: authSession } = useAuth();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get("session");

  const hubQuery = useApiQuery(getTeacherSpeakingSessions, [
    authSession?.accessToken,
  ]);

  const sessionQuery = useApiQuery(
    () => getSpeakingSession(urlSessionId!),
    [authSession?.accessToken, urlSessionId],
    { enabled: Boolean(urlSessionId) },
  );

  const bankQuery = useApiQuery(
    () => getSpeakingExaminerContent(urlSessionId!),
    [authSession?.accessToken, urlSessionId],
    { enabled: Boolean(urlSessionId) },
  );

  const value = useMemo<TeacherSpeakingValue>(() => {
    return {
      hubLoading: hubQuery.loading,
      hubError: hubQuery.error,
      hub: hubQuery.data
        ? mapTeacherSpeakingSessions(hubQuery.data)
        : emptyHub,
      refreshHub: hubQuery.refresh,
      sessionId: urlSessionId,
      sessionLoading: Boolean(urlSessionId) && sessionQuery.loading,
      sessionError: sessionQuery.error,
      session:
        urlSessionId && sessionQuery.data
          ? mapSpeakingSession(sessionQuery.data)
          : null,
      speakingContent: bankQuery.data?.content ?? null,
      contentLoading: bankQuery.loading,
      contentError: bankQuery.error,
      refreshSession: sessionQuery.refresh,
    };
  }, [urlSessionId, hubQuery, sessionQuery, bankQuery]);

  return (
    <TeacherSpeakingContext.Provider value={value}>
      {children}
    </TeacherSpeakingContext.Provider>
  );
}

export function useTeacherSpeaking() {
  const ctx = useContext(TeacherSpeakingContext);
  if (!ctx) {
    throw new Error("useTeacherSpeaking requires TeacherSpeakingProvider");
  }
  return ctx;
}
