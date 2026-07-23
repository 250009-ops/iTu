import type { ContentModule } from "@/lib/admin/types";
import { gapsInGroup, type AnswerKeyMap, hasAnswerKeyEntry } from "@/lib/admin/content/utils";
import type {
  Gap,
  ListeningContent,
  ListeningPart,
  QuestionGroup,
  ReadingContent,
  ReadingPassage,
} from "@/lib/exam/types";
import { renumberCompletionLines } from "@/lib/exam/inline-content";

export type PartitionRange = {
  from: number;
  to: number;
  expectedCount: number;
};

export type NumberingIssue = {
  id: string;
  severity: "error" | "warning";
  message: string;
  hint?: string;
};

export type PartitionStatus = {
  part: number;
  label: string;
  range: PartitionRange;
  /** Distinct question numbers present in content. */
  count: number;
  numbers: number[];
  missingAnswers: number;
  issues: NumberingIssue[];
};

const LISTENING_PARTITIONS: PartitionRange[] = [
  { from: 1, to: 10, expectedCount: 10 },
  { from: 11, to: 20, expectedCount: 10 },
  { from: 21, to: 30, expectedCount: 10 },
  { from: 31, to: 40, expectedCount: 10 },
];

const READING_PARTITIONS: PartitionRange[] = [
  { from: 1, to: 13, expectedCount: 13 },
  { from: 14, to: 26, expectedCount: 13 },
  { from: 27, to: 40, expectedCount: 14 },
];

export const IELTS_TOTAL_QUESTIONS = 40;

export function partitionRanges(module: "listening" | "reading"): PartitionRange[] {
  return module === "listening" ? LISTENING_PARTITIONS : READING_PARTITIONS;
}

export function partitionForPart(
  module: "listening" | "reading",
  part: number,
): PartitionRange {
  const ranges = partitionRanges(module);
  return ranges[part - 1] ?? ranges[ranges.length - 1]!;
}

export function partitionLabel(module: "listening" | "reading", part: number): string {
  return module === "listening" ? `Part ${part}` : `Passage ${part}`;
}

export function defaultPartitionBlurb(
  module: "listening" | "reading",
  part: number,
): string {
  const { from, to } = partitionForPart(module, part);
  if (module === "listening") {
    return `Listen and answer questions ${from}–${to}.`;
  }
  return `Read the text and answer questions ${from}–${to}.`;
}

function inferredReadingRange(numbers: number[]): PartitionRange | null {
  if (numbers.length === 0) return null;
  const from = numbers[0]!;
  const to = numbers[numbers.length - 1]!;
  return { from, to, expectedCount: to - from + 1 };
}

/** Ordered distinct question numbers across groups (uses inner gap/question numbers). */
export function collectOrderedNumbers(groups: QuestionGroup[]): number[] {
  const nums: number[] = [];
  for (const g of groups) {
    nums.push(...gapsInGroup(g));
  }
  return nums;
}

export function countAnsweredInPartition(
  numbers: number[],
  answerKey: AnswerKeyMap,
): number {
  return numbers.filter((n) => hasAnswerKeyEntry(answerKey, n)).length;
}

function renumberInlineNodes(
  nodes: import("@/lib/exam/types").InlineNode[],
  nums: number[],
  idx: { i: number },
): import("@/lib/exam/types").InlineNode[] {
  return nodes.map((node) => {
    if (typeof node === "object" && node !== null && "n" in node && !("type" in node)) {
      const n = nums[idx.i] ?? (node as Gap).n;
      idx.i += 1;
      return { ...node, n };
    }
    return node;
  });
}

/** Assign sequential question numbers inside a single group. */
export function setGroupQuestionNumbers(group: QuestionGroup, nums: number[]): QuestionGroup {
  if (nums.length === 0) {
    return { ...group, from: group.from, to: group.to };
  }

  const from = nums[0]!;
  const to = nums[nums.length - 1]!;
  let i = 0;

  switch (group.type) {
    case "tfng":
    case "yng":
    case "short_answer":
      return {
        ...group,
        from,
        to,
        questions: group.questions.map((q) => ({ ...q, n: nums[i++]! })),
      };
    case "mcq_single":
      return {
        ...group,
        from,
        to,
        questions: group.questions.map((q) => ({ ...q, n: nums[i++]! })),
      };
    case "matching":
    case "matching_headings":
    case "matching_features":
      return {
        ...group,
        from,
        to,
        questions: group.questions.map((q) => ({ ...q, n: nums[i++]! })),
      };
    case "flowchart_completion": {
      const idx = { i: 0 };
      return {
        ...group,
        from,
        to,
        steps: renumberCompletionLines(group.steps, nums, idx),
      };
    }
    case "instruction_screen":
      return { ...group, from: 0, to: 0 };
    case "matching_information":
      return {
        ...group,
        from,
        to,
        questions: group.questions.map((q) => ({ ...q, n: nums[i++]! })),
      };
    case "mcq_multi":
      return {
        ...group,
        from,
        to,
        numbers: nums.slice(0, group.numbers.length),
      };
    case "mcq_choose_n":
      return {
        ...group,
        from,
        to: from + group.chooseCount - 1,
      };
    case "map_labeling":
      if (group.layoutMode === "place_list") {
        return {
          ...group,
          from,
          to,
          questions: (group.questions ?? []).map((q) => ({ ...q, n: nums[i++]! })),
        };
      }
      return {
        ...group,
        from,
        to,
        zones: group.zones.map((z) => ({ ...z, n: nums[i++]! })),
      };
    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "summary_completion_list":
    case "sentence_completion": {
      const idx = { i: 0 };
      return {
        ...group,
        from,
        to,
        lines: renumberCompletionLines(group.lines, nums, idx),
      };
    }
    case "table_completion": {
      const idx = { i: 0 };
      return {
        ...group,
        from,
        to,
        rows: group.rows.map((row) =>
          row.map((cell) => renumberInlineNodes(cell, nums, idx)),
        ),
      };
    }
  }
}

/** Renumber all groups in a part/passage starting at the partition's first question. */
export function renumberPartitionGroups(
  groups: QuestionGroup[],
  partitionFrom: number,
): QuestionGroup[] {
  let next = partitionFrom;
  return groups.map((group) => {
    if (group.type === "instruction_screen") {
      return { ...group, from: 0, to: 0 };
    }
    const nums = gapsInGroup(group);
    const count = nums.length;
    if (count === 0) {
      return group;
    }
    const assigned = Array.from({ length: count }, (_, i) => next + i);
    next += count;
    return setGroupQuestionNumbers(group, assigned);
  });
}

export function renumberListeningContent(content: ListeningContent): ListeningContent {
  const parts = (content.parts ?? []).map((part) => {
    const range = partitionForPart("listening", part.part);
    return {
      ...part,
      groups: renumberPartitionGroups(part.groups ?? [], range.from),
    };
  });
  return { ...content, parts };
}

export function renumberReadingContent(content: ReadingContent): ReadingContent {
  let nextQuestion = 1;
  const passages = (content.passages ?? []).map((passage) => {
    const groups = renumberPartitionGroups(passage.groups ?? [], nextQuestion);
    nextQuestion += collectOrderedNumbers(groups).length;
    return {
      ...passage,
      groups,
    };
  });
  return { ...content, passages };
}

/** First question number when adding groups to a reading passage (sequential across passages). */
export function readingPassageStartNumber(
  passages: ReadingPassage[],
  index: number,
): number {
  const passage = passages[index];
  const currentNums = collectOrderedNumbers(passage?.groups ?? []);
  if (currentNums.length > 0) {
    return Math.min(...currentNums);
  }
  const previousNums = passages
    .slice(0, index)
    .flatMap((p) => collectOrderedNumbers(p.groups ?? []));
  if (previousNums.length > 0) {
    return Math.max(...previousNums) + 1;
  }
  return partitionForPart("reading", passage?.part ?? index + 1).from;
}

export function renumberModuleContent(
  module: "listening" | "reading",
  content: ListeningContent | ReadingContent,
): ListeningContent | ReadingContent {
  return module === "listening"
    ? renumberListeningContent(content as ListeningContent)
    : renumberReadingContent(content as ReadingContent);
}

/** Remap answer-key entries when question numbers shift (by ordered position). */
export function remapAnswerKeyByOrder(
  answerKey: AnswerKeyMap,
  oldNums: number[],
  newNums: number[],
): AnswerKeyMap {
  const next: AnswerKeyMap = { ...answerKey };
  const usedOld = new Set<number>();

  for (let i = 0; i < newNums.length; i++) {
    const newN = newNums[i]!;
    const oldN = oldNums[i];
    if (oldN !== undefined && oldN !== newN) {
      const val = answerKey[String(oldN)];
      if (val !== undefined) {
        next[String(newN)] = val;
        delete next[String(oldN)];
        usedOld.add(oldN);
      }
    }
  }

  for (const [k, v] of Object.entries(answerKey)) {
    if (!k.startsWith("$set$")) continue;
    const match = k.match(/^\$set\$(\d+)-(\d+)$/);
    if (!match) continue;

    const oldFrom = Number(match[1]);
    const oldTo = Number(match[2]);
    const mapped: number[] = [];
    let valid = true;

    for (let n = oldFrom; n <= oldTo; n++) {
      const idx = oldNums.indexOf(n);
      if (idx < 0) {
        valid = false;
        break;
      }
      mapped.push(newNums[idx]!);
    }

    if (!valid || mapped.length === 0) continue;

    const newFrom = Math.min(...mapped);
    const newTo = Math.max(...mapped);
    const newKey = `$set$${newFrom}-${newTo}`;
    if (newKey !== k) {
      delete next[k];
      next[newKey] = v;
    }
  }

  return next;
}

/** Remap answer keys passage-by-passage so edits in one passage never steal another's answers. */
export function remapAnswerKeyForReadingContent(
  answerKey: AnswerKeyMap,
  oldContent: ReadingContent,
  newContent: ReadingContent,
): AnswerKeyMap {
  let next = { ...answerKey };
  const oldPassages = oldContent.passages ?? [];
  const newPassages = newContent.passages ?? [];
  const count = Math.max(oldPassages.length, newPassages.length);
  for (let i = 0; i < count; i++) {
    const oldNums = collectOrderedNumbers(oldPassages[i]?.groups ?? []);
    const newNums = collectOrderedNumbers(newPassages[i]?.groups ?? []);
    next = remapAnswerKeyByOrder(next, oldNums, newNums);
  }
  return next;
}

/** Remap answer keys part-by-part (listening). */
export function remapAnswerKeyForListeningContent(
  answerKey: AnswerKeyMap,
  oldContent: ListeningContent,
  newContent: ListeningContent,
): AnswerKeyMap {
  let next = { ...answerKey };
  const oldParts = oldContent.parts ?? [];
  const newParts = newContent.parts ?? [];
  const count = Math.max(oldParts.length, newParts.length);
  for (let i = 0; i < count; i++) {
    const oldNums = collectOrderedNumbers(oldParts[i]?.groups ?? []);
    const newNums = collectOrderedNumbers(newParts[i]?.groups ?? []);
    next = remapAnswerKeyByOrder(next, oldNums, newNums);
  }
  return next;
}

export function collectGlobalNumbers(
  module: "listening" | "reading",
  content: ListeningContent | ReadingContent,
): number[] {
  const sections =
    module === "listening"
      ? (content as ListeningContent).parts ?? []
      : (content as ReadingContent).passages ?? [];

  const nums: number[] = [];
  for (const section of sections) {
    const groups = "groups" in section ? section.groups ?? [] : [];
    nums.push(...collectOrderedNumbers(groups));
  }
  return nums;
}

export function validatePartitionGroups(
  module: "listening" | "reading",
  part: number,
  groups: QuestionGroup[],
  answerKey: AnswerKeyMap = {},
): PartitionStatus {
  const numbers = collectOrderedNumbers(groups);
  const unique = [...new Set(numbers)].sort((a, b) => a - b);
  const range =
    module === "reading"
      ? inferredReadingRange(unique) ?? partitionForPart(module, part)
      : partitionForPart(module, part);
  const issues: NumberingIssue[] = [];

  if (unique.length !== numbers.length) {
    const dupes = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    issues.push({
      id: "overlap",
      severity: "error",
      message: `Duplicate question numbers: ${[...new Set(dupes)].join(", ")}`,
      hint: "Remove or merge overlapping groups.",
    });
  }

  for (const n of unique) {
    const outsideRange =
      module === "listening"
        ? n < range.from || n > range.to
        : n < 1 || n > IELTS_TOTAL_QUESTIONS;
    if (outsideRange) {
      issues.push({
        id: `out-of-range-${n}`,
        severity: "error",
        message:
          module === "listening"
            ? `Question ${n} is outside ${partitionLabel(module, part)} range (${range.from}–${range.to})`
            : `Question ${n} is outside the IELTS Reading range (1–${IELTS_TOTAL_QUESTIONS})`,
      });
    }
  }

  if (unique.length > 0) {
    for (let i = 1; i < unique.length; i++) {
      const prev = unique[i - 1]!;
      const curr = unique[i]!;
      if (curr - prev > 1) {
        issues.push({
          id: `gap-${prev}-${curr}`,
          severity: "warning",
          message: `Gap between questions ${prev} and ${curr}`,
          hint: "Add missing questions or renumber this section.",
        });
      }
    }
  }

  if (unique.length > range.expectedCount) {
    issues.push({
      id: "too-many",
      severity: "error",
      message: `${unique.length} questions — expected at most ${range.expectedCount} for this section`,
    });
  } else if (unique.length > 0 && unique.length < range.expectedCount) {
    issues.push({
      id: "too-few",
      severity: "warning",
      message: `${unique.length}/${range.expectedCount} questions in this section`,
      hint: `IELTS ${partitionLabel(module, part)} typically has ${range.expectedCount} questions (${range.from}–${range.to}).`,
    });
  }

  const missingAnswers = unique.filter((n) => !hasAnswerKeyEntry(answerKey, n)).length;

  if (unique.length > 0 && missingAnswers > 0) {
    issues.push({
      id: "missing-answers",
      severity: "warning",
      message: `${missingAnswers} question${missingAnswers === 1 ? "" : "s"} missing answer key`,
    });
  }

  return {
    part,
    label: partitionLabel(module, part),
    range,
    count: unique.length,
    numbers: unique,
    missingAnswers,
    issues,
  };
}

export function validateModuleNumbering(
  module: "listening" | "reading",
  content: ListeningContent | ReadingContent,
  answerKey: AnswerKeyMap = {},
): NumberingIssue[] {
  const issues: NumberingIssue[] = [];
  const sections =
    module === "listening"
      ? (content as ListeningContent).parts ?? []
      : (content as ReadingContent).passages ?? [];

  const partitionStatuses = sections.map((section) => {
    const part = section.part;
    const groups = section.groups ?? [];
    return validatePartitionGroups(module, part, groups, answerKey);
  });

  for (const status of partitionStatuses) {
    issues.push(...status.issues);
  }

  const allNums = collectGlobalNumbers(module, content);
  const unique = [...new Set(allNums)].sort((a, b) => a - b);

  if (unique.length > 0) {
    for (let i = 1; i < unique.length; i++) {
      const prev = unique[i - 1]!;
      const curr = unique[i]!;
      if (curr - prev > 1) {
        const id = `global-gap-${prev}-${curr}`;
        if (!issues.some((x) => x.id === id)) {
          issues.push({
            id,
            severity: "error",
            message: `Global gap: no question ${prev + 1} (jumps from ${prev} to ${curr})`,
            hint: "Use “Renumber all questions” or fill missing groups.",
          });
        }
      }
    }

    const globalDupes = allNums.filter((n, i) => allNums.indexOf(n) !== i);
    if (globalDupes.length > 0) {
      issues.push({
        id: "global-overlap",
        severity: "error",
        message: `Overlapping numbers across sections: ${[...new Set(globalDupes)].join(", ")}`,
      });
    }
  }

  if (unique.length !== IELTS_TOTAL_QUESTIONS) {
    issues.push({
      id: "total-count",
      severity: unique.length === 0 ? "warning" : "error",
      message: `${unique.length}/${IELTS_TOTAL_QUESTIONS} total questions in test`,
      hint: "Academic Listening and Reading tests use 40 questions.",
    });
  }

  return issues;
}

export function partitionStatusesForModule(
  module: "listening" | "reading",
  content: ListeningContent | ReadingContent,
  answerKey: AnswerKeyMap = {},
): PartitionStatus[] {
  const sections =
    module === "listening"
      ? (content as ListeningContent).parts ?? []
      : (content as ReadingContent).passages ?? [];

  return sections.map((section) =>
    validatePartitionGroups(module, section.part, section.groups ?? [], answerKey),
  );
}
