"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { getSpeakingSession } from "@/lib/api/grading";
import { getSpeakingExaminerContent } from "@/lib/api/speaking";
import { getTeacherDashboard } from "@/lib/api/teachers";
import {
  mapSpeakingSchedule,
  mapSpeakingSession,
} from "@/lib/api/mappers/teacher";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import type { SpeakingContent } from "@/lib/exam/types";

type TeacherSpeakingValue = {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  todaySessions: ReturnType<typeof mapSpeakingSchedule>;
  session: ReturnType<typeof mapSpeakingSession> | null;
  sessionId: string | null;
  speakingContent: SpeakingContent | null;
  contentLoading: boolean;
  contentError: string | null;
  refreshSession: () => Promise<void>;
};

const TeacherSpeakingContext = createContext<TeacherSpeakingValue | null>(null);

export function TeacherSpeakingProvider({ children }: { children: ReactNode }) {
  const { session: authSession } = useAuth();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get("session");

  const dashboard = useApiQuery(getTeacherDashboard, [authSession?.accessToken]);
  const [resolvedId, setResolvedId] = useState<string | null>(urlSessionId);
  const firstScheduledId = dashboard.data?.speakingSchedule[0]?.id ?? null;

  useEffect(() => {
    if (urlSessionId) {
      setResolvedId(urlSessionId);
      return;
    }
    setResolvedId(firstScheduledId);
  }, [urlSessionId, firstScheduledId]);

  const speaking = useApiQuery(
    () => getSpeakingSession(resolvedId!),
    [authSession?.accessToken, resolvedId],
    { enabled: Boolean(resolvedId) },
  );

  const bank = useApiQuery(
    () => getSpeakingExaminerContent(resolvedId!),
    [authSession?.accessToken, resolvedId],
    { enabled: Boolean(resolvedId) },
  );

  const value = useMemo<TeacherSpeakingValue>(() => {
    const todaySessions = dashboard.data
      ? mapSpeakingSchedule(dashboard.data)
      : [];
    const loading =
      dashboard.loading || (Boolean(resolvedId) && speaking.loading);
    const session =
      resolvedId && speaking.data ? mapSpeakingSession(speaking.data) : null;
    const sessionNotFound =
      Boolean(resolvedId) &&
      !speaking.loading &&
      !session &&
      speaking.error?.toLowerCase().includes("not found");

    const isEmpty = !loading && !session && !urlSessionId;

    const error =
      dashboard.error ??
      (urlSessionId && speaking.error ? speaking.error : null) ??
      (resolvedId && speaking.error && !sessionNotFound ? speaking.error : null);

    return {
      loading,
      error,
      isEmpty,
      todaySessions,
      sessionId: resolvedId,
      session,
      speakingContent: bank.data?.content ?? null,
      contentLoading: bank.loading,
      contentError: bank.error,
      refreshSession: speaking.refresh,
    };
  }, [resolvedId, urlSessionId, dashboard, speaking, bank]);

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
