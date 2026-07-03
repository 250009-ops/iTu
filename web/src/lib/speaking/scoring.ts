export type SpeakingPart = 1 | 2 | 3;

export type ScoringCriterion =
  | "fluency"
  | "lexical"
  | "grammar"
  | "pronunciation";

/** Full IELTS band scale: 0, 0.5, 1, … 9. */
export const ieltsBandOptions = Array.from(
  { length: 19 },
  (_, i) => i * 0.5,
) as readonly number[];

/** @deprecated Prefer ieltsBandOptions — kept for imports that expect this name. */
export const bandOptions = ieltsBandOptions;

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

export const speakingCriteria = [
  { id: "fluency" as ScoringCriterion, label: "Fluency & Coherence" },
  { id: "lexical" as ScoringCriterion, label: "Lexical Resource" },
  { id: "grammar" as ScoringCriterion, label: "Grammatical Range & Accuracy" },
  { id: "pronunciation" as ScoringCriterion, label: "Pronunciation" },
];

/** API keys expected by POST /grading/speaking/:id/score */
export const speakingCriteriaApiKeys: Record<ScoringCriterion, string> = {
  fluency: "fluencyCoherence",
  lexical: "lexicalResource",
  grammar: "grammar",
  pronunciation: "pronunciation",
};

const speakingApiKeyToCriterion: Record<string, ScoringCriterion> = {
  fluencyCoherence: "fluency",
  lexicalResource: "lexical",
  grammar: "grammar",
  pronunciation: "pronunciation",
  fluency: "fluency",
  lexical: "lexical",
};

export function toSpeakingCriteriaPayload(
  scores: Record<ScoringCriterion, number>,
): Record<string, number> {
  return Object.fromEntries(
    (Object.keys(speakingCriteriaApiKeys) as ScoringCriterion[]).map((id) => [
      speakingCriteriaApiKeys[id],
      scores[id],
    ]),
  );
}

export function fromSpeakingCriteriaPayload(
  criteriaScores: Record<string, number>,
): Partial<Record<ScoringCriterion, number>> {
  const mapped: Partial<Record<ScoringCriterion, number>> = {};
  for (const [key, value] of Object.entries(criteriaScores)) {
    const id = speakingApiKeyToCriterion[key];
    if (id != null && typeof value === "number") {
      mapped[id] = value;
    }
  }
  return mapped;
}

export function speakingGradeIsDirty(
  scores: Record<ScoringCriterion, number>,
  notes: string,
  saved: { scores: Record<ScoringCriterion, number>; notes: string },
): boolean {
  if (notes.trim() !== saved.notes.trim()) return true;
  return (Object.keys(saved.scores) as ScoringCriterion[]).some(
    (key) => scores[key] !== saved.scores[key],
  );
}
