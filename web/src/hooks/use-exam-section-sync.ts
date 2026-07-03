"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamSkill } from "@/lib/exam/types";
import { getExamSession } from "@/lib/api/exam";
import { examRouteAfterSection } from "@/lib/exam/package-skills";
import { useSseStream } from "@/hooks/use-sse-stream";

type Options = {
  /** When true, skip polling (section not started yet). */
  enabled?: boolean;
  pollMs?: number;
};

/**
 * Detects when the active section was submitted remotely (e.g. admin force submit)
 * via SSE, with slow polling as a fallback.
 */
export function useExamSectionSync(
  sessionId: string,
  skill: ExamSkill,
  { enabled = true, pollMs = 30_000 }: Options = {},
) {
  const router = useRouter();
  const localSubmitRef = useRef(false);
  const remoteHandledRef = useRef(false);
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null);

  const handleRemoteSubmit = async () => {
    if (localSubmitRef.current || remoteHandledRef.current) return;

    try {
      const session = await getExamSession(sessionId);
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
        router.replace(nextRoute);
      }, 1800);
    } catch {
      // keep listening / polling
    }
  };

  useSseStream(enabled ? `/exam-sessions/${sessionId}/events/stream` : null, {
    enabled,
    onMessage: (payload) => {
      const msg = payload as { type?: string; skill?: string };
      if (
        msg.type === "exam:section-submitted" &&
        msg.skill?.toLowerCase() === skill
      ) {
        void handleRemoteSubmit();
      }
    },
  });

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function sync() {
      if (!active) return;
      await handleRemoteSubmit();
    }

    void sync();
    const intervalId = window.setInterval(() => void sync(), pollMs);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [sessionId, skill, enabled, pollMs]);

  return {
    markLocalSubmit: () => {
      localSubmitRef.current = true;
    },
    remoteNotice,
  };
}
