import type { ContentModule } from "@/lib/admin/types";
import {
  listeningMediaReady,
  type MediaAssetRef,
} from "@/lib/admin/content/listening-media";
import { writingTask1ImageReady } from "@/lib/admin/content/writing-media";
import {
  IELTS_TOTAL_QUESTIONS,
  validateModuleNumbering,
  partitionStatusesForModule,
} from "@/lib/admin/content/numbering";
import type {
  Gap,
  InlineNode,
  ListeningContent,
  ListeningPart,
  QuestionGroup,
  ReadingContent,
  ReadingPassage,
  WritingContent,
} from "@/lib/exam/types";
import { isPlaceholderAnswerKey } from "@/lib/mock/exam-answer-keys";

export type AnswerKeyMap = Record<string, string | string[]>;

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function gapsInLines(lines: InlineNode[][]): number[] {
  const nums: number[] = [];
  for (const line of lines) {
    for (const node of line) {
      if (typeof node === "object" && node !== null && "n" in node) {
        nums.push(node.n);
      }
    }
  }
  return nums;
}

export function gapsInGroup(group: QuestionGroup): number[] {
  switch (group.type) {
    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "sentence_completion":
      return gapsInLines(group.lines);
    case "table_completion":
      return group.rows.flatMap((row) =>
        row.flatMap((cell) => gapsInLines([cell])),
      );
    case "mcq_single":
      return group.questions.map((q) => q.n);
    case "mcq_multi":
      return group.numbers;
    case "matching":
    case "matching_headings":
      return group.questions.map((q) => q.n);
    case "tfng":
    case "yng":
      return group.questions.map((q) => q.n);
    case "map_labeling":
      return group.zones.map((z) => z.n);
    case "short_answer":
      return group.questions.map((q) => q.n);
    default:
      return [];
  }
}

export function collectQuestionNumbers(
  module: ContentModule,
  content: object,
): number[] {
  const c = content as Record<string, unknown>;
  const nums: number[] = [];

  if (module === "listening") {
    const parts = (Array.isArray(c.parts) ? c.parts : []) as ListeningPart[];
    for (const part of parts) {
      for (const g of part.groups ?? []) {
        nums.push(...gapsInGroup(g));
      }
    }
    return [...new Set(nums)].sort((a, b) => a - b);
  }

  if (module === "reading") {
    const passages = (Array.isArray(c.passages) ? c.passages : []) as ReadingPassage[];
    for (const passage of passages) {
      for (const g of passage.groups ?? []) {
        nums.push(...gapsInGroup(g));
      }
    }
    return [...new Set(nums)].sort((a, b) => a - b);
  }

  return nums;
}

/** Keep existing answers; add empty slots for new question numbers. */
export function syncAnswerKey(
  module: ContentModule,
  content: object,
  existing: AnswerKeyMap,
): AnswerKeyMap {
  if (module !== "listening" && module !== "reading") return existing;

  const nums = collectQuestionNumbers(module, content);
  const next: AnswerKeyMap = {};
  for (const n of nums) {
    const key = String(n);
    next[key] = existing[key] ?? "";
  }
  return next;
}

export function countAnswered(key: AnswerKeyMap, nums: number[]): number {
  return nums.filter((n) => {
    const v = key[String(n)];
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim().length > 0;
  }).length;
}

export type ChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  hint?: string;
};

export function buildPublishChecklist(
  module: ContentModule,
  content: object,
  answerKey: AnswerKeyMap | null | undefined,
  mediaAssets: MediaAssetRef[] = [],
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const c = content as Record<string, unknown>;

  if (module === "listening") {
    const parts = Array.isArray(c.parts) ? c.parts.length : 0;
    items.push({
      id: "parts",
      label: `${parts}/4 listening parts defined`,
      ok: parts >= 4,
    });
    items.push({
      id: "audio",
      label: "Full listening audio uploaded",
      ok: listeningMediaReady(mediaAssets, content),
      hint: "Upload one MP3/WAV/OGG file covering all four parts.",
    });
  }

  if (module === "reading") {
    const passages = Array.isArray(c.passages) ? c.passages.length : 0;
    items.push({
      id: "passages",
      label: `${passages}/3 reading passages defined`,
      ok: passages >= 1,
    });
  }

  if (module === "writing") {
    const tasks = Array.isArray(c.tasks) ? c.tasks.length : 0;
    const writingContent = content as unknown as WritingContent;
    const task1 = writingContent.tasks?.find((t) => t.taskNumber === 1);
    const hasVisualType = Boolean(task1?.visual?.kind);
    items.push({
      id: "tasks",
      label: `${tasks}/2 writing tasks defined`,
      ok: tasks >= 2,
    });
    if (hasVisualType) {
      items.push({
        id: "task1-image",
        label: "Task 1 chart/diagram image uploaded",
        ok: writingTask1ImageReady(writingContent, mediaAssets),
        hint: "Upload the chart, graph, map, or diagram for Task 1.",
      });
    }
  }

  if (module === "speaking") {
    const parts = Array.isArray(c.parts) ? c.parts.length : 0;
    const cueCard = c.cueCard as { title?: string } | undefined;
    const p1 = Array.isArray(c.part1Questions)
      ? (c.part1Questions as string[]).filter((q) => q.trim()).length
      : 0;
    const p3 = Array.isArray(c.part3Questions)
      ? (c.part3Questions as string[]).filter((q) => q.trim()).length
      : 0;
    items.push({
      id: "parts",
      label: `${parts}/3 speaking parts defined`,
      ok: parts >= 3,
    });
    items.push({
      id: "cue",
      label: "Part 2 cue card configured",
      ok: Boolean(cueCard?.title?.trim()),
    });
    items.push({
      id: "part1-questions",
      label: `${p1} Part 1 interviewer questions`,
      ok: p1 >= 3,
      hint: "Add at least 3 Part 1 questions for the examiner console.",
    });
    items.push({
      id: "part3-questions",
      label: `${p3} Part 3 discussion questions`,
      ok: p3 >= 3,
      hint: "Add at least 3 Part 3 questions for the examiner console.",
    });
  }

  if (module === "listening" || module === "reading") {
    const nums = collectQuestionNumbers(module, content);
    const key = answerKey ?? {};
    const skillContent = content as unknown as ListeningContent | ReadingContent;

    items.push({
      id: "questions",
      label: `${nums.length}/${IELTS_TOTAL_QUESTIONS} questions numbered in content`,
      ok: nums.length === IELTS_TOTAL_QUESTIONS,
      hint:
        nums.length !== IELTS_TOTAL_QUESTIONS
          ? "Academic Listening and Reading tests use 40 questions."
          : undefined,
    });
    items.push({
      id: "answers",
      label: `${countAnswered(key, nums)}/${nums.length} answers filled in`,
      ok: nums.length > 0 && countAnswered(key, nums) === nums.length,
    });
    items.push({
      id: "placeholder",
      label: "Answer key is not placeholder scaffolding",
      ok: !isPlaceholderAnswerKey(key),
    });

    const numberingIssues = validateModuleNumbering(
      module,
      skillContent,
      key,
    ).filter((i) => i.severity === "error");
    items.push({
      id: "numbering",
      label:
        numberingIssues.length === 0
          ? "Question numbering has no gaps or overlaps"
          : `${numberingIssues.length} numbering issue${numberingIssues.length === 1 ? "" : "s"}`,
      ok: numberingIssues.length === 0,
      hint: numberingIssues[0]?.message,
    });

    const partitions = partitionStatusesForModule(module, skillContent, key);
    for (const status of partitions) {
      const partitionOk =
        status.count === status.range.expectedCount &&
        !status.issues.some((i) => i.severity === "error");
      items.push({
        id: `partition-${status.part}`,
        label: `${status.label}: ${status.count}/${status.range.expectedCount} questions (${status.range.from}–${status.range.to})`,
        ok: partitionOk,
        hint: status.issues.find((i) => i.severity === "error")?.message,
      });
    }
  }

  return items;
}

export function allChecklistOk(items: ChecklistItem[]): boolean {
  return items.length > 0 && items.every((i) => i.ok);
}
