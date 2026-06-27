"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamSkill } from "@/lib/exam/types";
import { getExamSession } from "@/lib/api/exam";
import { examRouteAfterSection } from "@/lib/exam/package-skills";

type Options = {
  /** When true, skip polling (section not started yet). */
  enabled?: boolean;
  pollMs?: number;
};

/**
 * Detects when the active section was submitted remotely (e.g. admin force submit)
 * and redirects the student to the next part of their mock.
 */
export function useExamSectionSync(
  sessionId: string,
  skill: ExamSkill,
  { enabled = true, pollMs = 5000 }: Options = {},
) {
  const router = useRouter();
  const localSubmitRef = useRef(false);
  const remoteHandledRef = useRef(false);
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function sync() {
      try {
        const session = await getExamSession(sessionId);
        if (!active || localSubmitRef.current || remoteHandledRef.current) return;

        const section = session.sections.find((s) => s.skill === skill);
        if (!section?.submittedAt) return;

        remoteHandledRef.current = true;
        const nextRoute = examRouteAfterSection(
          sessionId,
          session.enrollment.package.skills,
          skill,
        );
        setRemoteNotice(
          "This section was ended by an administrator. Continuing with the next part of your mock…",
        );
        window.setTimeout(() => {
          if (active) router.replace(nextRoute);
        }, 1800);
      } catch {
        // keep polling
      }
    }

    void sync();
    const intervalId = window.setInterval(() => void sync(), pollMs);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [sessionId, skill, enabled, pollMs, router]);

  return {
    markLocalSubmit: () => {
      localSubmitRef.current = true;
    },
    remoteNotice,
  };
}
