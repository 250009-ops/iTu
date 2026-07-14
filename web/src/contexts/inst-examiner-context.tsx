"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getMe } from "@/lib/api/auth";
import { getWritingGradingHub } from "@/lib/api/grading";
import { getTeacherSpeakingSessions } from "@/lib/api/teachers";

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
  badges: { speaking: number; writing: number };
}

const InstExaminerContext = createContext<InstExaminerContextValue | undefined>(
  undefined,
);

export function InstExaminerProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InstExaminerInfo | null>(null);
  const [isInstitutionExaminer, setIsInstitutionExaminer] = useState(false);
  const [badges, setBadges] = useState({ speaking: 0, writing: 0 });

  useEffect(() => {
    let cancelled = false;

    void getMe()
      .then(async (user) => {
        if (cancelled) return;
        const linked = user.role === "teacher" && user.institution != null;
        setIsInstitutionExaminer(linked);
        setInfo({
          name: user.name,
          email: user.email,
          center: user.institution
            ? { id: user.institution.id, name: user.institution.name }
            : null,
        });

        if (linked) {
          const [speaking, writing] = await Promise.allSettled([
            getTeacherSpeakingSessions(),
            getWritingGradingHub(),
          ]);
          if (!cancelled) {
            setBadges({
              speaking:
                speaking.status === "fulfilled"
                  ? speaking.value.counts.upcoming
                  : 0,
              writing:
                writing.status === "fulfilled"
                  ? writing.value.counts.pending
                  : 0,
            });
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
      value={{ loading, isInstitutionExaminer, info, badges }}
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
