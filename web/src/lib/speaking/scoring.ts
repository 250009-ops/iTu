export type SpeakingPart = 1 | 2 | 3;

export type ScoringCriterion =
  | "fluency"
  | "lexical"
  | "grammar"
  | "pronunciation";

/** Live scoring values; null means the examiner has not selected a band yet. */
export type SpeakingScoreValues = Record<ScoringCriterion, number | null>;

export function emptySpeakingScores(): SpeakingScoreValues {
  return {
    fluency: null,
    lexical: null,
    grammar: null,
    pronunciation: null,
  };
}

export function speakingScoresFromSaved(
  criteriaScores?: Record<string, number> | null,
): SpeakingScoreValues {
  const scores = emptySpeakingScores();
  if (criteriaScores) {
    for (const [key, value] of Object.entries(
      fromSpeakingCriteriaPayload(criteriaScores),
    )) {
      scores[key as ScoringCriterion] = value;
    }
  }
  return scores;
}

export function speakingScoresComplete(
  scores: SpeakingScoreValues,
): scores is Record<ScoringCriterion, number> {
  return (Object.keys(scores) as ScoringCriterion[]).every(
    (key) => scores[key] != null,
  );
}

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

export function computeOverall(scores: SpeakingScoreValues): number | null {
  if (!speakingScoresComplete(scores)) return null;
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

export function assertSpeakingScoresComplete(
  scores: SpeakingScoreValues,
): Record<ScoringCriterion, number> {
  if (!speakingScoresComplete(scores)) {
    throw new Error("All speaking criteria must be scored before submit");
  }
  return scores;
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
  scores: SpeakingScoreValues,
  notes: string,
  saved: { scores: SpeakingScoreValues; notes: string },
): boolean {
  if (notes.trim() !== saved.notes.trim()) return true;
  return (Object.keys(saved.scores) as ScoringCriterion[]).some(
    (key) => scores[key] !== saved.scores[key],
  );
}
