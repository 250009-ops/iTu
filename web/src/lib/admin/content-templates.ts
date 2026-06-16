import {
  listeningAnswerKey,
  readingAnswerKey,
} from "@/lib/mock/exam-answer-keys";
import type { ContentModule } from "@/lib/admin/types";
import {
  listeningContent,
  readingContent,
  speakingStudentContent,
  writingContent,
} from "@/lib/mock/exam-content";

const CODE_PREFIX: Record<ContentModule, string> = {
  listening: "LIS",
  reading: "REA",
  writing: "WRI",
  speaking: "SPK",
};

const DEFAULT_DURATION: Record<ContentModule, number> = {
  listening: 32,
  reading: 60,
  writing: 60,
  speaking: 20,
};

function stripTestId<T extends { testId?: string }>(value: T): Omit<T, "testId"> {
  const { testId: _id, ...rest } = value;
  return rest;
}

export function suggestTestCode(module: ContentModule): string {
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${CODE_PREFIX[module]}-ACAD-${suffix}`;
}

export function defaultTestTitle(module: ContentModule): string {
  const label = module.charAt(0).toUpperCase() + module.slice(1);
  return `${label} — Academic Mock`;
}

export function getContentTemplate(module: ContentModule): {
  content: object;
  answerKey?: object;
  durationMin: number;
} {
  switch (module) {
    case "listening":
      return {
        content: stripTestId(listeningContent),
        answerKey: { ...listeningAnswerKey },
        durationMin: DEFAULT_DURATION.listening,
      };
    case "reading":
      return {
        content: stripTestId(readingContent),
        answerKey: { ...readingAnswerKey },
        durationMin: DEFAULT_DURATION.reading,
      };
    case "writing":
      return {
        content: stripTestId(writingContent),
        durationMin: DEFAULT_DURATION.writing,
      };
    case "speaking":
      return {
        content: stripTestId(speakingStudentContent),
        durationMin: DEFAULT_DURATION.speaking,
      };
  }
}

export function moduleUsesAnswerKey(module: ContentModule): boolean {
  return module === "listening" || module === "reading";
}
