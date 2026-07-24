"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useSseStream } from "@/hooks/use-sse-stream";
import { getMe } from "@/lib/api/auth";
import { getTeacherDashboard } from "@/lib/api/teachers";
import { getSpeakingQueue, getWritingQueue } from "@/lib/api/grading";
import {
  canAccessSpeaking,
  canAccessWriting,
  normalizeExaminerSpeciality,
  type ExaminerSpeciality,
} from "@/lib/inst-examiner/speciality";

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
  const [speciality, setSpeciality] = useState<ExaminerSpeciality | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMe()
      .then((user) => {
        if (cancelled) return;
        setSpeciality(
          normalizeExaminerSpeciality(user.teacherProfile?.speciality),
        );
      })
      .catch(() => {
        if (!cancelled) setSpeciality("both");
      });
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const allowWriting = speciality != null && canAccessWriting(speciality);
  const allowSpeaking = speciality != null && canAccessSpeaking(speciality);

  const dashboard = useApiQuery(getTeacherDashboard, [session?.accessToken], {
    enabled: speciality != null,
  });
  const writingQueue = useApiQuery(getWritingQueue, [session?.accessToken], {
    enabled: allowWriting,
  });
  const speakingQueue = useApiQuery(getSpeakingQueue, [session?.accessToken], {
    enabled: allowSpeaking,
  });
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

    const writing = allowWriting
      ? (writingQueue.data?.filter(
          (item) => item.status?.toLowerCase() !== "graded",
        ).length ??
        dashboard.data?.stats.writingQueue ??
        0)
      : 0;
    const speaking = allowSpeaking
      ? (speakingQueue.data?.length ?? dashboard.data?.stats.speakingQueue ?? 0)
      : 0;

    return { speaking, writing };
  }, [
    streamCounts,
    allowWriting,
    allowSpeaking,
    dashboard.data,
    writingQueue.data,
    speakingQueue.data,
  ]);

  return (
    <TeacherNavBadgesContext.Provider value={value}>
      {children}
    </TeacherNavBadgesContext.Provider>
  );
}

export function useTeacherNavBadges() {
  return useContext(TeacherNavBadgesContext);
}
