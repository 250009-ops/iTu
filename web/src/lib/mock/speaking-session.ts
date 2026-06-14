export type SpeakingPart = 1 | 2 | 3;

export type ScoringCriterion =
  | "fluency"
  | "lexical"
  | "grammar"
  | "pronunciation";

export const speakingSession = {
  studentName: "Alex Johnson",
  studentInitials: "AJ",
  timeRange: "14:00 – 14:20",
  activePart: 2 as SpeakingPart,
  elapsedSeconds: 522, // 08:42
  connectionStatus: "Excellent Connection",
  criteria: [
    { id: "fluency" as ScoringCriterion, label: "Fluency & Coherence" },
    { id: "lexical" as ScoringCriterion, label: "Lexical Resource" },
    { id: "grammar" as ScoringCriterion, label: "Grammatical Range & Accuracy" },
    { id: "pronunciation" as ScoringCriterion, label: "Pronunciation" },
  ],
  defaultScores: {
    fluency: 7,
    lexical: 7,
    grammar: 7,
    pronunciation: 7,
  } as Record<ScoringCriterion, number>,
  overallBand: 7.0,
};

export const bandOptions = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9] as const;

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function computeOverall(
  scores: Record<ScoringCriterion, number>,
): number {
  const values = Object.values(scores);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 2) / 2;
}
