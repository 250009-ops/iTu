"use client";

import { useCallback, useMemo, useState } from "react";
import type { InstructionScreenGroup, QuestionGroup } from "@/lib/exam/types";
import { gapsInGroup } from "@/lib/admin/content/utils";

/** Tracks dismissed instruction screens and returns the next blocking interstitial. */
export function useInstructionGate(groups: QuestionGroup[]) {
  const [dismissTick, setDismissTick] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const blocking = useMemo(() => {
    void dismissTick;
    for (const g of groups) {
      if (g.type === "instruction_screen" && !dismissed.has(g.id)) {
        return g as InstructionScreenGroup;
      }
    }
    return null;
  }, [groups, dismissed, dismissTick]);

  const dismiss = useCallback(
    (groupId: string) => {
      setDismissed((prev) => new Set(prev).add(groupId));
      setDismissTick((t) => t + 1);
    },
    [],
  );

  const questionGroups = useMemo(
    () => groups.filter((g) => g.type !== "instruction_screen"),
    [groups],
  );

  const nextQuestionAfter = useCallback(
    (groupId: string): number | null => {
      const idx = groups.findIndex((g) => g.id === groupId);
      if (idx < 0) return null;
      for (let i = idx + 1; i < groups.length; i++) {
        const nums = gapsInGroup(groups[i]!);
        if (nums.length > 0) return nums[0]!;
      }
      return null;
    },
    [groups],
  );

  return { blocking, dismiss, questionGroups, nextQuestionAfter };
}
