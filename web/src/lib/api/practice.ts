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
  mode?: string;
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

/** Normalize current + legacy glossary JSON into player entries. */
export function normalizePracticeGlossary(raw: unknown): PracticeGlossaryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PracticeGlossaryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    // Current pack shape: { span, sense:{en}, kind, paragraphMarker }
    if (typeof row.span === "string" && row.span.trim()) {
      const senseRaw =
        row.sense && typeof row.sense === "object"
          ? (row.sense as Record<string, unknown>)
          : {};
      const kind = row.kind;
      out.push({
        paragraphMarker:
          typeof row.paragraphMarker === "string" ? row.paragraphMarker : null,
        span: row.span.trim(),
        kind:
          kind === "phrase" || kind === "idiom" || kind === "collocation"
            ? kind
            : "word",
        sense: {
          en: typeof senseRaw.en === "string" ? senseRaw.en : String(senseRaw.en ?? ""),
          uz: typeof senseRaw.uz === "string" ? senseRaw.uz : undefined,
          ru: typeof senseRaw.ru === "string" ? senseRaw.ru : undefined,
        },
        pos: typeof row.pos === "string" ? row.pos : undefined,
        level: typeof row.level === "string" ? row.level : undefined,
      });
      continue;
    }

    // Legacy seed shape: { term, en, uz?, paragraphIndex? }
    if (typeof row.term === "string" && row.term.trim()) {
      const idx =
        typeof row.paragraphIndex === "number" ? row.paragraphIndex : null;
      out.push({
        paragraphMarker:
          idx != null ? String.fromCharCode(65 + idx) : null,
        span: row.term.trim(),
        kind: "word",
        sense: {
          en: typeof row.en === "string" ? row.en : "",
          uz: typeof row.uz === "string" ? row.uz : undefined,
          ru: typeof row.ru === "string" ? row.ru : undefined,
        },
      });
    }
  }
  return out;
}

export type PracticeVocabItem = {
  word: string;
  contextMeaning: string;
  collocations: string[];
  wordFamily: string[];
  ieltsParaphrases: string[];
  occurrenceAnchor: {
    paragraphMarker: string | null;
    sentenceQuote: string;
  } | null;
};

export type PracticeParaphraseDrill = {
  n: number;
  type: string;
  prompt: string;
  acceptedAnswers: string[];
  explanation: string;
};

/** Normalize current + legacy vocabPack JSON into review cards. */
export function normalizePracticeVocabPack(raw: unknown): PracticeVocabItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PracticeVocabItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const word =
      typeof row.word === "string"
        ? row.word.trim()
        : typeof row.term === "string"
          ? row.term.trim()
          : "";
    if (!word) continue;

    const anchorRaw =
      row.occurrenceAnchor && typeof row.occurrenceAnchor === "object"
        ? (row.occurrenceAnchor as Record<string, unknown>)
        : null;
    const paragraphMarker =
      typeof anchorRaw?.paragraphMarker === "string"
        ? anchorRaw.paragraphMarker
        : typeof row.paragraphMarker === "string"
          ? row.paragraphMarker
          : typeof row.paragraphIndex === "number"
            ? String.fromCharCode(65 + row.paragraphIndex)
            : null;
    const sentenceQuote =
      typeof anchorRaw?.sentenceQuote === "string"
        ? anchorRaw.sentenceQuote
        : typeof row.example === "string"
          ? row.example
          : "";

    const asStringArray = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        : [];

    out.push({
      word,
      contextMeaning:
        typeof row.contextMeaning === "string"
          ? row.contextMeaning
          : typeof row.definition === "string"
            ? row.definition
            : typeof row.en === "string"
              ? row.en
              : "",
      collocations: asStringArray(row.collocations),
      wordFamily: asStringArray(row.wordFamily),
      ieltsParaphrases: asStringArray(row.ieltsParaphrases),
      occurrenceAnchor:
        paragraphMarker || sentenceQuote
          ? { paragraphMarker, sentenceQuote }
          : null,
    });
  }
  return out;
}

/** Normalize current + legacy paraphrase drill JSON into gym cards. */
export function normalizePracticeParaphraseDrills(
  raw: unknown,
): PracticeParaphraseDrill[] {
  if (!Array.isArray(raw)) return [];
  const out: PracticeParaphraseDrill[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;

    // Current shape: { n, type, prompt, acceptedAnswers[], explanation }
    if (typeof row.prompt === "string" && row.prompt.trim()) {
      const accepted = Array.isArray(row.acceptedAnswers)
        ? row.acceptedAnswers.filter(
            (v): v is string => typeof v === "string" && v.trim().length > 0,
          )
        : [];
      out.push({
        n: typeof row.n === "number" ? row.n : idx + 1,
        type: typeof row.type === "string" ? row.type : "paraphrase",
        prompt: row.prompt.trim(),
        acceptedAnswers: accepted,
        explanation: typeof row.explanation === "string" ? row.explanation : "",
      });
      return;
    }

    // Legacy seed shape: { stem, options[], answerIndex, explanation }
    if (typeof row.stem === "string" && row.stem.trim()) {
      const options = Array.isArray(row.options)
        ? row.options.filter(
            (v): v is string => typeof v === "string" && v.trim().length > 0,
          )
        : [];
      const answerIndex =
        typeof row.answerIndex === "number" ? row.answerIndex : 0;
      const accepted =
        options[answerIndex] != null ? [options[answerIndex]] : options.slice(0, 1);
      out.push({
        n: idx + 1,
        type: "multiple-choice",
        prompt: [row.stem.trim(), ...options.map((o, i) => `${i + 1}. ${o}`)].join(
          "\n",
        ),
        acceptedAnswers: accepted,
        explanation: typeof row.explanation === "string" ? row.explanation : "",
      });
    }
  });
  return out;
}

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
  vocabPack: PracticeVocabItem[];
  paraphraseDrills: PracticeParaphraseDrill[];
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
