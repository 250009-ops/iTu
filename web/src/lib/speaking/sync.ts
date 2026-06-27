export const SPEAKING_PHASES = [
  "part1",
  "part2-prep",
  "part2-speak",
  "part3",
  "complete",
] as const;

export type SpeakingPhase = (typeof SPEAKING_PHASES)[number];

export type SpeakingSyncMessage =
  | { type: "phase"; phase: SpeakingPhase }
  | { type: "session-end" }
  | { type: "examiner-ready" }
  | { type: "prep-end" };

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
    if (parsed.type === "session-end" || parsed.type === "examiner-ready" || parsed.type === "prep-end") {
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
