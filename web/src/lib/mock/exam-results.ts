export type SkillId = "listening" | "reading" | "writing" | "speaking";

export type PartTone = "emerald" | "amber" | "rose" | "sky";

export interface ModulePart {
  label: string;
  sublabel: string;
  tag: string;
  tagTone: PartTone;
  value: number;
  max: number;
  /** "raw" shows value/max questions, "band" shows value/9 band score */
  unit: "raw" | "band";
}

export interface ModuleDetail {
  summary: string;
  band: number;
  parts: ModulePart[];
  focus: string;
}

export interface SkillResult {
  id: SkillId;
  name: string;
  band: number;
  delta: number;
}

export interface AttemptRow {
  id: string;
  date: string;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  overall: number;
  overallDelta?: number;
  latest?: boolean;
}

export interface ProgressionPoint {
  date: string;
  overall: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
}

export interface ImprovementOpportunity {
  rank: number;
  title: string;
  detail: string;
  priority: "High" | "Med" | "Low";
  tone: PartTone;
}

export const examResults = {
  mockId: "MOCK-004",
  dateLabel: "June 5, 2026",
  title: "Full Academic Mock — June 5, 2026",
  subtitle: "Mock ID: MOCK-004 · IDP Computer-delivered format · All 4 modules",
  examType: "Academic IELTS",
  examFormat: "Academic",
  overallBand: 7.0,
  bandLabel: "Band 7 — Good User",
  targetBand: 7.0,
  targetAchieved: true,
  improvement: 0.5,
  overallImprovement: 1.5,
  speakingExaminer: "Dr. Emma Williams",
  writingExaminer: "Dr. Sarah Chen",

  skills: [
    { id: "listening", name: "Listening", band: 7.5, delta: 0.5 },
    { id: "reading", name: "Reading", band: 7.0, delta: 0.5 },
    { id: "writing", name: "Writing", band: 6.5, delta: 0.5 },
    { id: "speaking", name: "Speaking", band: 7.0, delta: 0.5 },
  ] satisfies SkillResult[],

  moduleDetails: {
    listening: {
      summary:
        "36 out of 40 correct answers. Strong across all parts — minor gaps in Part 4 note completion.",
      band: 7.5,
      parts: [
        { label: "Part 1", sublabel: "Conversation", tag: "Perfect", tagTone: "emerald", value: 10, max: 10, unit: "raw" },
        { label: "Part 2", sublabel: "Monologue", tag: "1 error", tagTone: "amber", value: 9, max: 10, unit: "raw" },
        { label: "Part 3", sublabel: "Discussion", tag: "1 error", tagTone: "amber", value: 9, max: 10, unit: "raw" },
        { label: "Part 4", sublabel: "Lecture", tag: "2 errors", tagTone: "rose", value: 8, max: 10, unit: "raw" },
      ],
      focus:
        "Part 4 lecture-style listening. Practise academic note-completion tasks with complex vocabulary and fast-paced academic monologues.",
    },
    reading: {
      summary:
        "32 out of 40 correct answers. Matching Headings was the weakest task — accuracy drops on dense academic passages.",
      band: 7.0,
      parts: [
        { label: "Passage 1", sublabel: "Factual", tag: "1 error", tagTone: "amber", value: 12, max: 13, unit: "raw" },
        { label: "Passage 2", sublabel: "Discursive", tag: "3 errors", tagTone: "rose", value: 10, max: 13, unit: "raw" },
        { label: "Passage 3", sublabel: "Analytical", tag: "4 errors", tagTone: "rose", value: 10, max: 14, unit: "raw" },
      ],
      focus:
        "Matching Headings and paragraph-level skimming. Build a timed routine for identifying main ideas before reading detail.",
    },
    writing: {
      summary:
        "Graded by Dr. Sarah Chen. Clear structure and strong ideas — grammatical range is the main barrier to Band 7.",
      band: 6.5,
      parts: [
        { label: "Task Achievement", sublabel: "Task 1 + 2", tag: "Strong", tagTone: "emerald", value: 7, max: 9, unit: "band" },
        { label: "Coherence & Cohesion", sublabel: "Structure", tag: "Strong", tagTone: "emerald", value: 7, max: 9, unit: "band" },
        { label: "Lexical Resource", sublabel: "Vocabulary", tag: "Good", tagTone: "amber", value: 6.5, max: 9, unit: "band" },
        { label: "Grammatical Range", sublabel: "Accuracy", tag: "Develop", tagTone: "rose", value: 6, max: 9, unit: "band" },
      ],
      focus:
        "Grammatical Range & Accuracy. Practise complex sentence structures and reduce minor errors under timed conditions.",
    },
    speaking: {
      summary:
        "Examined by Dr. Emma Williams. Fluent and well-organised responses — Part 3 abstract discussion has the most headroom.",
      band: 7.0,
      parts: [
        { label: "Fluency & Coherence", sublabel: "Delivery", tag: "Strong", tagTone: "emerald", value: 7, max: 9, unit: "band" },
        { label: "Lexical Resource", sublabel: "Vocabulary", tag: "Strong", tagTone: "emerald", value: 7, max: 9, unit: "band" },
        { label: "Grammatical Range", sublabel: "Accuracy", tag: "Good", tagTone: "amber", value: 6.5, max: 9, unit: "band" },
        { label: "Pronunciation", sublabel: "Clarity", tag: "Strong", tagTone: "emerald", value: 7, max: 9, unit: "band" },
      ],
      focus:
        "Part 3 abstract discussion. Develop extended answers with hypothetical language and well-supported opinions.",
    },
  } satisfies Record<SkillId, ModuleDetail>,

  scoreProgression: [
    { date: "Mar 8", overall: 5.5, listening: 6.0, reading: 5.5, writing: 5.0, speaking: 5.5 },
    { date: "Apr 20", overall: 6.0, listening: 6.5, reading: 6.0, writing: 5.5, speaking: 6.0 },
    { date: "May 15", overall: 6.5, listening: 7.0, reading: 6.5, writing: 6.0, speaking: 6.5 },
    { date: "Jun 5", overall: 7.0, listening: 7.5, reading: 7.0, writing: 6.5, speaking: 7.0 },
  ] satisfies ProgressionPoint[],

  attempts: [
    {
      id: "MOCK-004",
      date: "Jun 5, 2026",
      listening: 7.5,
      reading: 7.0,
      writing: 6.5,
      speaking: 7.0,
      overall: 7.0,
      overallDelta: 0.5,
      latest: true,
    },
    {
      id: "MOCK-003",
      date: "May 15, 2026",
      listening: 7.0,
      reading: 6.5,
      writing: 6.0,
      speaking: 6.5,
      overall: 6.5,
      overallDelta: 0.5,
    },
    {
      id: "MOCK-002",
      date: "Apr 20, 2026",
      listening: 6.5,
      reading: 6.0,
      writing: 5.5,
      speaking: 6.0,
      overall: 6.0,
      overallDelta: 0.5,
    },
    {
      id: "MOCK-001",
      date: "Mar 8, 2026",
      listening: 6.0,
      reading: 5.5,
      writing: 5.0,
      speaking: 5.5,
      overall: 5.5,
    },
  ] satisfies AttemptRow[],

  improvementOpportunities: [
    {
      rank: 1,
      title: "Writing — Grammatical Range",
      detail: "Band 6.0 → 7.0 target",
      priority: "High",
      tone: "rose",
    },
    {
      rank: 2,
      title: "Reading — Matching Headings",
      detail: "69% accuracy → 80% target",
      priority: "High",
      tone: "rose",
    },
    {
      rank: 3,
      title: "Speaking — Part 3 Abstract",
      detail: "Band 6.5 → 7.5 target",
      priority: "Med",
      tone: "amber",
    },
    {
      rank: 4,
      title: "Listening — Part 4 Lecture",
      detail: "80% accuracy → 90% target",
      priority: "Low",
      tone: "sky",
    },
  ] satisfies ImprovementOpportunity[],

  targetMessage:
    "Excellent result. Ready to push further? Band 7.5 is within reach — focus on Writing grammar and you're there.",

  nextSteps: [
    "Review Writing Task 2 grammar notes",
    "Complete 3 matching-heading practice sets",
    "Watch Part 3 discussion strategy video",
    "Download and review this PDF report",
  ],
};
