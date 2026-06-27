import type {
  SpeakingContent,
  SpeakingPart1Topic,
} from "@/lib/exam/types";
import type { SpeakingPhase } from "@/lib/speaking/sync";

export type ExaminerPart1Topic = {
  title: string;
  questions: string[];
};

export type ExaminerPartDef = {
  part: 1 | 2 | 3;
  title: string;
  durationLabel: string;
  targetSeconds: number;
  /** Flat prompt list (Part 2 notes, or legacy flat Part 1/3). */
  prompts: string[];
  /** Part 1/3 topic groupings when configured in Content Studio. */
  topics?: ExaminerPart1Topic[];
  cueCard?: { topic: string; bullets: string[] };
};

const DEFAULT_PART1_TOPICS: ExaminerPart1Topic[] = [
  {
    title: "Introduction",
    questions: [
      "Can you tell me your full name, please?",
      "Where are you from, and do you live in a house or a flat?",
    ],
  },
  {
    title: "Work / study",
    questions: ["Let's talk about your work or studies. What do you do?"],
  },
  {
    title: "Free time",
    questions: ["Do you enjoy your free time? What do you usually do?"],
  },
];

const DEFAULT_PART2_NOTES: string[] = [
  "Give the candidate 1 minute to prepare.",
  "Ask them to speak for 1–2 minutes.",
  "Ask one or two rounding-off questions afterwards.",
];

const DEFAULT_PART3_TOPICS: ExaminerPart1Topic[] = [
  {
    title: "Skills & education",
    questions: [
      "What skills do you think are most important for young people today?",
      "Do you think some skills are becoming less useful over time?",
    ],
  },
  {
    title: "Technology & learning",
    questions: [
      "How has technology changed the way people learn new skills?",
    ],
  },
  {
    title: "Policy & society",
    questions: [
      "Should governments invest more in skills training? Why?",
    ],
  },
];

export function formatPartDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins <= 5) return `${mins - 1}–${mins} minutes`;
  return `~${mins} minutes`;
}

function normalizeTopicGroups(
  topics: SpeakingPart1Topic[] | undefined,
  legacyQuestions: string[] | undefined,
  legacyTitle: string,
  defaults: ExaminerPart1Topic[],
): ExaminerPart1Topic[] {
  const normalized = (topics ?? [])
    .map((topic) => ({
      title: topic.title?.trim() ?? "",
      questions: (topic.questions ?? []).filter((q) => q.trim().length > 0),
    }))
    .filter((topic) => topic.title || topic.questions.length > 0);

  if (normalized.length > 0) return normalized;

  const legacy = legacyQuestions?.filter((q) => q.trim().length > 0) ?? [];
  if (legacy.length > 0) {
    return [{ title: legacyTitle, questions: legacy }];
  }

  return defaults;
}

/** Build examiner part definitions from published speaking content. */
export function buildExaminerParts(content: SpeakingContent): ExaminerPartDef[] {
  const parts = content.parts ?? [];
  const p1 = parts.find((p) => p.part === 1);
  const p2 = parts.find((p) => p.part === 2);
  const p3 = parts.find((p) => p.part === 3);

  const part1Topics = normalizeTopicGroups(
    content.part1Topics,
    content.part1Questions,
    "General questions",
    DEFAULT_PART1_TOPICS,
  );
  const part3Topics = normalizeTopicGroups(
    content.part3Topics,
    content.part3Questions,
    "General discussion",
    DEFAULT_PART3_TOPICS,
  );
  const part2Notes =
    content.part2ExaminerNotes?.filter((q) => q.trim().length > 0) ??
    DEFAULT_PART2_NOTES;

  const cueCard = content.cueCard;
  const cueBullets = cueCard?.bullets?.filter((b) => b.trim().length > 0) ?? [];

  return [
    {
      part: 1,
      title: p1?.title ?? "Introduction & Interview",
      durationLabel: p1 ? formatPartDuration(p1.durationSec) : "4–5 minutes",
      targetSeconds: p1?.durationSec ?? 300,
      prompts: part1Topics.flatMap((topic) => topic.questions),
      topics: part1Topics,
    },
    {
      part: 2,
      title: p2?.title ?? "Long Turn (Cue Card)",
      durationLabel: p2 ? formatPartDuration(p2.durationSec) : "3–4 minutes",
      targetSeconds: p2?.durationSec ?? 240,
      prompts: part2Notes,
      cueCard:
        cueCard?.title?.trim() && cueBullets.length > 0
          ? { topic: cueCard.title, bullets: cueBullets }
          : undefined,
    },
    {
      part: 3,
      title: p3?.title ?? "Two-way Discussion",
      durationLabel: p3 ? formatPartDuration(p3.durationSec) : "4–5 minutes",
      targetSeconds: p3?.durationSec ?? 300,
      prompts: part3Topics.flatMap((topic) => topic.questions),
      topics: part3Topics,
    },
  ];
}

export function partUsesTopics(part: ExaminerPartDef | undefined): boolean {
  return part?.part !== 2 && Boolean(part?.topics?.length);
}

export function promptForPhase(
  part: ExaminerPartDef,
  promptIndex: number,
  phase: SpeakingPhase,
  topicIndex = 0,
): string {
  if ((part.part === 1 || part.part === 3) && part.topics?.length) {
    const topic = part.topics[topicIndex] ?? part.topics[0];
    return topic?.questions[promptIndex] ?? "";
  }

  if (part.part === 2) {
    if (phase === "part2-prep") {
      return part.prompts[0] ?? "Give the candidate 1 minute to prepare.";
    }
    if (phase === "part2-speak") {
      return part.prompts[1] ?? "Ask the candidate to speak for 1–2 minutes.";
    }
    return part.prompts[promptIndex] ?? part.prompts[0] ?? "";
  }
  return part.prompts[promptIndex] ?? "";
}

export function emptySpeakingTopic(): SpeakingPart1Topic {
  return { title: "", questions: [""] };
}

/** @deprecated Use emptySpeakingTopic */
export const emptyPart1Topic = emptySpeakingTopic;

/** Strip examiner-only fields before sending content to students. */
export function sanitizeSpeakingContentForStudent(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const {
    part1Topics: _t1,
    part1Questions: _p1,
    part3Topics: _t3,
    part3Questions: _p3,
    part2ExaminerNotes: _notes,
    ...student
  } = content;
  return student;
}
