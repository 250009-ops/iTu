"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useSseStream } from "@/hooks/use-sse-stream";
import { getMe } from "@/lib/api/auth";
import { getSpeakingQueue, getWritingGradingHub } from "@/lib/api/grading";
import {
  canAccessSpeaking,
  canAccessWriting,
  normalizeExaminerSpeciality,
  type ExaminerSpeciality,
} from "@/lib/inst-examiner/speciality";

export interface InstExaminerInfo {
  name: string;
  email: string;
  center: { id: string; name: string } | null;
}

interface InstExaminerContextValue {
  loading: boolean;
  /** True once we've confirmed the user is a center-scoped examiner. */
  isInstitutionExaminer: boolean;
  info: InstExaminerInfo | null;
  speciality: ExaminerSpeciality;
  badges: { speaking: number; writing: number };
  refreshBadges: () => void;
}

const InstExaminerContext = createContext<InstExaminerContextValue | undefined>(
  undefined,
);

export function InstExaminerProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InstExaminerInfo | null>(null);
  const [isInstitutionExaminer, setIsInstitutionExaminer] = useState(false);
  const [speciality, setSpeciality] = useState<ExaminerSpeciality>("both");
  const [badges, setBadges] = useState({ speaking: 0, writing: 0 });
  const [badgeTick, setBadgeTick] = useState(0);

  const refreshBadges = useCallback(() => {
    setBadgeTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getMe()
      .then(async (user) => {
        if (cancelled) return;
        const linked = user.role === "teacher" && user.institution != null;
        const examinerSpeciality = normalizeExaminerSpeciality(
          user.teacherProfile?.speciality,
        );
        setIsInstitutionExaminer(linked);
        setSpeciality(examinerSpeciality);
        setInfo({
          name: user.name,
          email: user.email,
          center: user.institution
            ? { id: user.institution.id, name: user.institution.name }
            : null,
        });

        if (linked) {
          const badgeRequests: Promise<{
            area: "speaking" | "writing";
            count: number;
          }>[] = [];
          if (canAccessSpeaking(examinerSpeciality)) {
            badgeRequests.push(
              getSpeakingQueue().then((res) => ({
                area: "speaking" as const,
                // Align with marketplace getNavBadgeCounts: completed, ungraded.
                count: res.length,
              })),
            );
          }
          if (canAccessWriting(examinerSpeciality)) {
            badgeRequests.push(
              getWritingGradingHub().then((res) => ({
                area: "writing" as const,
                // Align with marketplace nav badges: PENDING + IN_REVIEW.
                count: res.counts.pending + res.counts.inReview,
              })),
            );
          }

          const results = await Promise.allSettled(badgeRequests);
          if (!cancelled) {
            const next = { speaking: 0, writing: 0 };
            for (const result of results) {
              if (result.status === "fulfilled") {
                next[result.value.area] = result.value.count;
              }
            }
            setBadges(next);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsInstitutionExaminer(false);
          setInfo(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, badgeTick, session?.accessToken]);

  useSseStream(session?.accessToken ? "/teachers/nav-badges/stream" : null, {
    enabled: Boolean(session?.accessToken) && isInstitutionExaminer,
    onMessage: (payload) => {
      const msg = payload as {
        type?: string;
        speaking?: number;
        writing?: number;
      };
      if (msg.type === "badges") {
        setBadges({
          speaking: msg.speaking ?? 0,
          writing: msg.writing ?? 0,
        });
      }
    },
  });

  return (
    <InstExaminerContext.Provider
      value={{
        loading,
        isInstitutionExaminer,
        info,
        speciality,
        badges,
        refreshBadges,
      }}
    >
      {children}
    </InstExaminerContext.Provider>
  );
}

export function useInstExaminer(): InstExaminerContextValue {
  const ctx = useContext(InstExaminerContext);
  if (!ctx) {
    throw new Error(
      "useInstExaminer must be used within InstExaminerProvider",
    );
  }
  return ctx;
}
