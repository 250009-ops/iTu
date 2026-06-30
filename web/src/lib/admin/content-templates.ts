import {
  listeningAnswerKey,
  readingAnswerKey,
} from "@/lib/mock/exam-answer-keys";
import { getNextContentTestIdentity } from "@/lib/api/admin";
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

const TITLE_PREFIX: Record<ContentModule, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
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

/** Placeholder shown before the next identity loads from the API. */
export function placeholderTestCode(module: ContentModule): string {
  return `${CODE_PREFIX[module]}-MOCK-A001`;
}

/** Placeholder shown before the next identity loads from the API. */
export function placeholderTestTitle(module: ContentModule): string {
  return `${TITLE_PREFIX[module]} Mock-A001`;
}

export async function fetchNextTestIdentity(
  module: ContentModule,
): Promise<{ code: string; title: string }> {
  return getNextContentTestIdentity(module);
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
