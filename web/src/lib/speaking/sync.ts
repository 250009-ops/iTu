export const SPEAKING_PHASES = [
  "part1",
  "part2-prep",
  "part2-speak",
  "part3",
  "complete",
] as const;

export type SpeakingPhase = (typeof SPEAKING_PHASES)[number];

export type SpeakingStudentIntegrityEvent =
  | "tab_switch"
  | "fullscreen_exit"
  | "page_leave";

export type SpeakingSyncMessage =
  | { type: "phase"; phase: SpeakingPhase }
  | { type: "session-end" }
  | { type: "examiner-ready" }
  | { type: "prep-end" }
  | { type: "examiner-left" }
  | { type: "student-integrity"; event: SpeakingStudentIntegrityEvent };

export const SPEAKING_SYNC_TOPIC = "ielts-speaking";

export function encodeSyncMessage(message: SpeakingSyncMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(message));
}

export function decodeSyncMessage(payload: Uint8Array): SpeakingSyncMessage | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(payload)) as SpeakingSyncMessage;
    if (parsed.type === "phase" && SPEAKING_PHASES.includes(parsed.phase)) {
      return parsed;
    }
    if (
      parsed.type === "session-end" ||
      parsed.type === "examiner-ready" ||
      parsed.type === "prep-end" ||
      parsed.type === "examiner-left"
    ) {
      return parsed;
    }
    if (
      parsed.type === "student-integrity" &&
      (parsed.event === "tab_switch" ||
        parsed.event === "fullscreen_exit" ||
        parsed.event === "page_leave")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function phaseToPart(phase: SpeakingPhase): 1 | 2 | 3 {
  if (phase === "part1") return 1;
  if (phase === "part3" || phase === "complete") return 3;
  return 2;
}

export function partToPhase(part: 1 | 2 | 3): SpeakingPhase {
  if (part === 1) return "part1";
  if (part === 2) return "part2-prep";
  return "part3";
}

const PHASE_RANK: Record<SpeakingPhase, number> = {
  part1: 1,
  "part2-prep": 2,
  "part2-speak": 3,
  part3: 4,
  complete: 5,
};

/** Avoid rewinding Part 2 prep once the student has started speaking. */
export function resolveIncomingPhase(
  incoming: SpeakingPhase,
  current: SpeakingPhase,
  part2SpeakStarted: boolean,
): SpeakingPhase {
  if (incoming === "part2-prep" && part2SpeakStarted) {
    return "part2-speak";
  }
  if (
    incoming === "part2-prep" &&
    current === "part2-speak" &&
    PHASE_RANK[current] > PHASE_RANK[incoming]
  ) {
    return current;
  }
  return incoming;
}

/** When the examiner re-selects Part 2, resume the correct sub-phase. */
export function resolvePart2ReentryPhase(
  current: SpeakingPhase,
  part2SpeakStarted: boolean,
  part2PrepStarted: boolean,
): SpeakingPhase {
  if (part2SpeakStarted || current === "part2-speak") {
    return "part2-speak";
  }
  if (part2PrepStarted || current === "part2-prep") {
    return "part2-prep";
  }
  return "part2-prep";
}
