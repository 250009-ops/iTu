import { apiFetch } from "./client";

export type PracticeWallet = {
  readingPassages: number;
  readingQuestionTypes: number;
  listeningSections: number;
  listeningQuestionTypes: number;
  aiWritingEssays: number;
};

export type PracticeBundle = {
  readingPassages?: number;
  readingQuestionTypes?: number;
  listeningSections?: number;
  listeningQuestionTypes?: number;
  aiWritingEssays?: number;
};

export type PracticeProductPackage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  bundle: PracticeBundle;
  displayPrices: Partial<Record<keyof PracticeBundle, number>>;
  isActive: boolean;
  mostPopular: boolean;
};

export type PracticeLibraryUnit = {
  id: string;
  code: string;
  title: string;
  type: string;
  skill: string;
  questionType: string | null;
  durationMin: number;
  questionCount: number;
  creditType: string;
};

export type PracticeAttemptSummary = {
  id: string;
  attemptCode: string;
  status: string;
  score: { rawScore?: number; band?: number | null; totalQuestions?: number } | null;
  startedAt: string;
  completedAt: string | null;
  unit: {
    id: string;
    title: string;
    type: string;
    skill: string;
    questionType: string | null;
  };
};

export type WritingSections = {
  introduction: string;
  bodyParagraphs: string[];
  conclusion: string;
};

export type WritingImprovementAnnotation = {
  scope: "word" | "sentence";
  original: string;
  suggestion: string;
  category: "grammar" | "style" | "vocabulary" | "clarity";
  explanation?: string;
};

export type WritingPracticeSession = {
  id: string;
  sessionCode: string;
  taskNumber: number;
  sections: WritingSections;
  aiFeedback: {
    improvedSections: WritingSections;
    annotations: WritingImprovementAnnotation[];
    summary: string;
    wordCount: number;
  } | null;
  status: string;
  creditConsumedAt: string | null;
  prompt?: {
    id: string;
    title: string;
    taskNumber: number;
    instruction?: string;
    minWords?: number;
    imageUrl?: string | null;
  };
};

export function getPracticeWallet() {
  return apiFetch<PracticeWallet>("/practice/wallet");
}

export function getPracticePackages() {
  return apiFetch<PracticeProductPackage[]>("/practice/packages");
}

export function checkoutPracticePackage(packageId: string) {
  return apiFetch<{
    orderId: string;
    orderCode: string;
    status: string;
    checkoutUrl: string | null;
    checkoutExpiresAt: string | null;
    amount: number;
    currency: string;
  }>("/practice/checkout", { method: "POST", body: { packageId } });
}

export function getPracticeLibrary(params?: {
  skill?: string;
  type?: string;
  questionType?: string;
}) {
  const q = new URLSearchParams();
  if (params?.skill) q.set("skill", params.skill);
  if (params?.type) q.set("type", params.type);
  if (params?.questionType) q.set("questionType", params.questionType);
  const qs = q.toString();
  return apiFetch<PracticeLibraryUnit[]>(
    `/practice/library${qs ? `?${qs}` : ""}`,
  );
}

export function getPracticeAttempts() {
  return apiFetch<PracticeAttemptSummary[]>("/practice/attempts");
}

export function startPracticeAttempt(unitId: string) {
  return apiFetch<{
    attempt: { id: string; attemptCode: string; status: string; startedAt: string };
    unit: { id: string; title: string; skill: string; content: unknown; durationMin: number };
  }>("/practice/attempts", { method: "POST", body: { unitId } });
}

export function getPracticeAttempt(id: string) {
  return apiFetch<{
    attempt: {
      id: string;
      attemptCode: string;
      status: string;
      answers: Record<string, unknown>;
      score: unknown;
    };
    unit: { id: string; title: string; skill: string; content: unknown; durationMin: number };
  }>(`/practice/attempts/${id}`);
}

export function savePracticeAnswers(id: string, answers: Record<string, unknown>) {
  return apiFetch(`/practice/attempts/${id}/answers`, {
    method: "PATCH",
    body: { answers },
  });
}

export function submitPracticeAttempt(id: string) {
  return apiFetch<{
    attemptCode: string;
    status: string;
    score: { rawScore: number; band: number | null; totalQuestions: number; correct: number };
    answers: Record<string, unknown>;
    answerKey: Record<string, string | string[]> | null;
  }>(`/practice/attempts/${id}/submit`, { method: "POST" });
}

export function getWritingPrompts(taskNumber?: number) {
  const qs = taskNumber ? `?taskNumber=${taskNumber}` : "";
  return apiFetch<
    {
      id: string;
      code: string;
      title: string;
      taskNumber: number;
      minWords: number;
      instruction: string;
      imageUrl: string | null;
    }[]
  >(`/practice/writing/prompts${qs}`);
}

export function getWritingSessions() {
  return apiFetch<WritingPracticeSession[]>("/practice/writing/sessions");
}

export function createWritingSession(promptId: string, sections?: Partial<WritingSections>) {
  return apiFetch<WritingPracticeSession>("/practice/writing/sessions", {
    method: "POST",
    body: { promptId, sections },
  });
}

export function getWritingSession(id: string) {
  return apiFetch<WritingPracticeSession>(`/practice/writing/sessions/${id}`);
}

export function updateWritingSession(id: string, sections: WritingSections) {
  return apiFetch<WritingPracticeSession>(`/practice/writing/sessions/${id}`, {
    method: "PATCH",
    body: { sections },
  });
}

export function analyzeWritingSession(id: string) {
  return apiFetch<WritingPracticeSession>(
    `/practice/writing/sessions/${id}/analyze`,
    { method: "POST" },
  );
}
