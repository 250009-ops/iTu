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
  contentSummary?: string;
};

export type PracticeAllowance = {
  readingPassages: number;
  readingQuestionTypes: number;
  listeningSections: number;
  listeningQuestionTypes: number;
  aiWritingEssays: number;
  wallet: PracticeWallet | null;
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

export function getPracticeAllowance() {
  return apiFetch<PracticeAllowance>("/practice/allowance");
}

export function getPracticePackages() {
  return apiFetch<PracticeProductPackage[]>("/practice/packages");
}

export function checkoutPracticePackage(
  packageId: string,
  portalBasePath?: string,
) {
  return apiFetch<{
    orderId: string;
    orderCode: string;
    status: string;
    checkoutUrl: string | null;
    checkoutExpiresAt: string | null;
    amount: number;
    currency: string;
  }>("/practice/checkout", {
    method: "POST",
    body: { packageId, portalBasePath },
  });
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

export type PracticeAttemptMode = "practice" | "skim" | "scan" | "guided";

export function startPracticeAttempt(
  unitId: string,
  mode: PracticeAttemptMode = "practice",
) {
  return apiFetch<{
    attempt: {
      id: string;
      attemptCode: string;
      status: string;
      mode?: string;
      startedAt: string;
    };
    unit: {
      id: string;
      title: string;
      skill: string;
      content: unknown;
      durationMin: number;
    };
  }>("/practice/attempts", { method: "POST", body: { unitId, mode } });
}

export function getPracticeAttempt(id: string) {
  return apiFetch<{
    attempt: {
      id: string;
      attemptCode: string;
      status: string;
      mode?: string;
      answers: Record<string, unknown>;
      score: unknown;
    };
    unit: {
      id: string;
      title: string;
      skill: string;
      content: unknown;
      durationMin: number;
      questionType?: string | null;
    };
  }>(`/practice/attempts/${id}`);
}

export type PracticeReviewItem = {
  n: number;
  yourAnswer: unknown;
  correctAnswer: unknown;
  verdict: "correct" | "incorrect" | "skipped";
  rationale: string | null;
  trap: string | null;
  evidence: {
    paragraphMarker: string | null;
    sentenceQuote: string;
    degraded?: boolean;
  } | null;
  paraphraseMap: { question: string; passage: string }[];
  options: { key: string; verdict: string; whyNot: string }[];
  keywords: string[];
  questionType: string | null;
  degraded: boolean;
};

export type PracticeGlossaryEntry = {
  paragraphMarker: string | null;
  span: string;
  kind: "word" | "phrase" | "idiom" | "collocation";
  sense: { en: string; uz?: string; ru?: string };
  pos?: string;
  level?: string;
};

export type PracticeReviewPayload = {
  attempt: {
    id: string;
    attemptCode: string;
    mode: string;
    score: {
      rawScore?: number;
      band?: number | null;
      totalQuestions?: number;
    } | null;
    completedAt: string | null;
  };
  unit: {
    id: string;
    title: string;
    type: string;
    skill: string;
    questionType: string | null;
    content: unknown;
  };
  packStatus: string;
  sectionStatus: Record<string, string>;
  items: PracticeReviewItem[];
  glossary: PracticeGlossaryEntry[];
  vocabPack: {
    word: string;
    contextMeaning: string;
    collocations: string[];
    wordFamily: string[];
    ieltsParaphrases: string[];
    occurrenceAnchor: {
      paragraphMarker: string | null;
      sentenceQuote: string;
    };
  }[];
  paraphraseDrills: {
    n: number;
    type: string;
    prompt: string;
    acceptedAnswers: string[];
    explanation: string;
  }[];
  skimScanTasks: {
    skim: {
      paragraphMarker: string | null;
      mainIdeaQuestion: string;
      options: string[];
      correct: number;
    }[];
    scan: {
      id: string;
      prompt: string;
      targetQuote: string;
      paragraphMarker: string | null;
      expectedSeconds: number;
    }[];
  } | null;
  strategyPlaybook: unknown;
  strategyTemplates: {
    questionType: string;
    label: string;
    decisionRule: string;
    traps: string[];
    steps: {
      id: string;
      title: string;
      instruction: string;
      studentAction: string;
    }[];
    hintLadder: { level: number; label: string; instruction: string }[];
  }[];
  evidenceChips: {
    id: string;
    label: string;
    questionN: number;
    paragraphMarker: string | null;
    sentenceQuote: string;
  }[];
};

export function getPracticeReview(attemptId: string) {
  return apiFetch<PracticeReviewPayload>(
    `/practice/attempts/${attemptId}/review`,
  );
}

export function getPracticeUnitAiPack(unitId: string) {
  return apiFetch<{
    status: string;
    glossary: PracticeGlossaryEntry[];
    skimScanTasks: PracticeReviewPayload["skimScanTasks"];
    strategyTemplates: PracticeReviewPayload["strategyTemplates"];
    strategyPlaybook: unknown;
  }>(`/practice/units/${unitId}/ai-pack`);
}

export function getPracticeTutorMessages(attemptId: string) {
  return apiFetch<
    {
      id: string;
      role: string;
      content: string;
      sourceChipId: string | null;
      questionN: number | null;
      createdAt: string;
    }[]
  >(`/practice/attempts/${attemptId}/tutor`);
}

export function askPracticeTutor(
  attemptId: string,
  body: { message?: string; chipId?: string; questionN?: number },
) {
  return apiFetch<{
    id: string;
    role: string;
    content: string;
    sourceChipId: string | null;
    questionN: number | null;
    createdAt: string;
  }>(`/practice/attempts/${attemptId}/tutor`, {
    method: "POST",
    body,
  });
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
