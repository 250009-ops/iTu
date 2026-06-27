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
  CompletionLine,
  Gap,
  InlineNode,
  ListeningContent,
  ListeningPart,
  QuestionGroup,
  ReadingContent,
  ReadingPassage,
  SpeakingPart1Topic,
  WritingContent,
} from "@/lib/exam/types";
import { gapsInCompletionLines } from "@/lib/exam/inline-content";
import { isPlaceholderAnswerKey } from "@/lib/mock/exam-answer-keys";

export type AnswerKeyMap = Record<string, string | string[]>;

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function gapsInInlineNodes(nodes: InlineNode[]): number[] {
  const nums: number[] = [];
  for (const node of nodes) {
    if (typeof node === "object" && node !== null && "n" in node && !("type" in node)) {
      nums.push((node as Gap).n);
    }
  }
  return nums;
}

export function gapsInLines(lines: CompletionLine[]): number[] {
  return gapsInCompletionLines(lines);
}

/** Defensive array coercion so malformed content can never throw at runtime. */
function arr<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function gapsInGroup(group: QuestionGroup): number[] {
  switch (group.type) {
    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "summary_completion_list":
    case "sentence_completion":
      return gapsInLines(arr(group.lines));
    case "table_completion":
      return arr(group.rows).flatMap((row) =>
        arr(row).flatMap((cell) => gapsInInlineNodes(arr(cell))),
      );
    case "mcq_single":
      return arr(group.questions).map((q) => q.n);
    case "mcq_multi":
      return arr(group.numbers);
    case "matching":
    case "matching_headings":
    case "matching_information":
    case "matching_features":
      return arr(group.questions).map((q) => q.n);
    case "flowchart_completion":
      return arr(group.nodes)
        .filter((node) => node.kind === "gap")
        .map((node) => node.n);
    case "instruction_screen":
      return [];
    case "tfng":
    case "yng":
      return arr(group.questions).map((q) => q.n);
    case "map_labeling":
      if (group.layoutMode === "place_list") {
        return arr(group.questions).map((q) => q.n);
      }
      return arr(group.zones).map((z) => z.n);
    case "short_answer":
      return arr(group.questions).map((q) => q.n);
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

/** Whether a question number has a complete answer-key entry (including $set$ ranges). */
export function hasAnswerKeyEntry(answerKey: AnswerKeyMap, n: number): boolean {
  const v = answerKey[String(n)];
  if (v != null) {
    if (Array.isArray(v)) return v.length > 0;
    if (String(v).trim().length > 0) return true;
  }
  for (const [k, val] of Object.entries(answerKey)) {
    if (!k.startsWith("$set$") || typeof val !== "string" || !val.trim()) continue;
    const match = k.match(/^\$set\$(\d+)-(\d+)$/);
    if (!match) continue;
    const from = Number(match[1]);
    const to = Number(match[2]);
    if (n >= from && n <= to) {
      const letters = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return letters.length >= to - from + 1;
    }
  }
  return false;
}

/** Keep existing answers; add empty slots for new question numbers. Preserves $set$ keys. */
export function syncAnswerKey(
  module: ContentModule,
  content: object,
  existing: AnswerKeyMap,
): AnswerKeyMap {
  if (module !== "listening" && module !== "reading") return existing;

  const nums = collectQuestionNumbers(module, content);
  const next: AnswerKeyMap = {};

  for (const [k, v] of Object.entries(existing)) {
    if (k.startsWith("$set$")) {
      next[k] = v;
    }
  }

  for (const n of nums) {
    const key = String(n);
    next[key] = existing[key] ?? "";
  }
  return next;
}

export function countAnswered(key: AnswerKeyMap, nums: number[]): number {
  return nums.filter((n) => hasAnswerKeyEntry(key, n)).length;
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
    const topics = Array.isArray(c.part1Topics)
      ? (c.part1Topics as SpeakingPart1Topic[])
      : [];
    const legacyP1 = Array.isArray(c.part1Questions)
      ? (c.part1Questions as string[]).filter((q) => q.trim()).length
      : 0;
    const topicCount = topics.filter(
      (topic) =>
        topic.title?.trim() ||
        (topic.questions ?? []).some((q) => q.trim()),
    ).length;
    const questionCount = topics.reduce(
      (sum, topic) =>
        sum + (topic.questions ?? []).filter((q) => q.trim()).length,
      legacyP1,
    );
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
      id: "part1-topics",
      label: `${topicCount} Part 1 topics · ${questionCount} questions`,
      ok: topicCount >= 2 && questionCount >= 3,
      hint: "Add at least 2 Part 1 topics with 3+ questions total.",
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
