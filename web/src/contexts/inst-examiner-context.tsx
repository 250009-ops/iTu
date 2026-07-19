"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getMe } from "@/lib/api/auth";
import { getInstExaminerOverview } from "@/lib/api/inst-examiner";
import { getTeacherSpeakingSessions } from "@/lib/api/teachers";
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
}

const InstExaminerContext = createContext<InstExaminerContextValue | undefined>(
  undefined,
);

export function InstExaminerProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InstExaminerInfo | null>(null);
  const [isInstitutionExaminer, setIsInstitutionExaminer] = useState(false);
  const [speciality, setSpeciality] = useState<ExaminerSpeciality>("both");
  const [badges, setBadges] = useState({ speaking: 0, writing: 0 });

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
          const badgeRequests: Promise<{ area: "speaking" | "writing"; count: number }>[] =
            [];
          if (canAccessSpeaking(examinerSpeciality)) {
            badgeRequests.push(
              getTeacherSpeakingSessions().then((res) => ({
                area: "speaking" as const,
                count: res.counts.upcoming,
              })),
            );
          }
          if (canAccessWriting(examinerSpeciality)) {
            badgeRequests.push(
              getInstExaminerOverview().then((res) => ({
                area: "writing" as const,
                count: res.writingQueue.filter((item) => item.readyToGrade)
                  .length,
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
  }, []);

  return (
    <InstExaminerContext.Provider
      value={{ loading, isInstitutionExaminer, info, speciality, badges }}
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
