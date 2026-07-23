import { ExamSkill, PracticeUnitType } from '@prisma/client';
import { nextSequentialCode } from '../../common/id-allocation';

const QUESTION_TYPE_CODES: Record<string, string> = {
  tfng: 'TFNG',
  yng: 'YNG',
  form_completion: 'FORM',
  note_completion: 'NOTE',
  summary_completion: 'SUMM',
  summary_completion_list: 'SUML',
  table_completion: 'TABLE',
  flowchart_completion: 'FLOW',
  map_labeling: 'MAP',
  matching_information: 'MINF',
  matching_headings: 'MHEAD',
  matching_features: 'MFEAT',
  matching: 'MATCH',
  mcq_single: 'MCQ',
  mcq_multi: 'MCQM',
  mcq_choose_n: 'CHOS',
  sentence_completion: 'SENT',
  short_answer: 'SHORT',
};

export function questionTypeCodeForPrefix(type: string | undefined): string | null {
  if (!type) return null;
  return QUESTION_TYPE_CODES[type] ?? type.toUpperCase().replace(/_/g, '').slice(0, 6);
}

export function skillForUnitType(type: PracticeUnitType): ExamSkill {
  switch (type) {
    case 'READING_PASSAGE':
    case 'READING_QUESTION_TYPE':
      return ExamSkill.READING;
    case 'LISTENING_SECTION':
    case 'LISTENING_QUESTION_TYPE':
      return ExamSkill.LISTENING;
    default:
      return ExamSkill.READING;
  }
}

export function prefixForUnitType(
  type: PracticeUnitType,
  options?: {
    passagePart?: number;
    listeningPart?: number;
    questionType?: string;
  },
): string {
  switch (type) {
    case 'READING_PASSAGE': {
      const part = options?.passagePart;
      if (part === 1 || part === 2 || part === 3) return `PRA-REA-P${part}-`;
      return 'PRA-REA-P';
    }
    case 'READING_QUESTION_TYPE': {
      const code = questionTypeCodeForPrefix(options?.questionType);
      if (code) return `PRA-REA-Q-${code}-`;
      return 'PRA-REA-Q';
    }
    case 'LISTENING_SECTION': {
      const part = options?.listeningPart;
      if (part === 1 || part === 2 || part === 3 || part === 4) {
        return `PRA-LIS-S${part}-`;
      }
      return 'PRA-LIS-S';
    }
    case 'LISTENING_QUESTION_TYPE': {
      const code = questionTypeCodeForPrefix(options?.questionType);
      if (code) return `PRA-LIS-Q-${code}-`;
      return 'PRA-LIS-Q';
    }
    default:
      return 'PRA-UNK';
  }
}

export async function nextPracticeUnitCode(
  prisma: { practiceUnit: { findMany: (args: object) => Promise<{ code: string }[]> } },
  type: PracticeUnitType,
  options?: {
    passagePart?: number;
    listeningPart?: number;
    questionType?: string;
  },
): Promise<string> {
  const prefix = prefixForUnitType(type, options);
  const existing = await prisma.practiceUnit.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  return nextSequentialCode(
    existing.map((row) => row.code),
    prefix,
  );
}

export async function nextWritingPromptCode(
  prisma: { writingPracticePrompt: { findMany: (args: object) => Promise<{ code: string }[]> } },
  taskNumber: number,
): Promise<string> {
  const prefix = `PRA-WRI-T${taskNumber}-`;
  const existing = await prisma.writingPracticePrompt.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  return nextSequentialCode(
    existing.map((row) => row.code),
    prefix,
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function assertPracticeUnitCode(
  type: PracticeUnitType,
  code: string,
  options?: {
    passagePart?: number;
    listeningPart?: number;
    questionType?: string;
  },
): void {
  const normalized = code.trim().toUpperCase();
  const patterns: RegExp[] = [];

  if (type === 'READING_PASSAGE') {
    if (options?.passagePart) {
      patterns.push(
        new RegExp(
          `^${escapeRegex(prefixForUnitType(type, options))}\\d{3,}$`,
        ),
      );
    } else {
      patterns.push(/^PRA-REA-P\d{3,}$/);
      patterns.push(/^PRA-REA-P[123]-\d{3,}$/);
    }
  } else if (type === 'LISTENING_SECTION') {
    if (options?.listeningPart) {
      patterns.push(
        new RegExp(
          `^${escapeRegex(prefixForUnitType(type, options))}\\d{3,}$`,
        ),
      );
    } else {
      patterns.push(/^PRA-LIS-S\d{3,}$/);
      patterns.push(/^PRA-LIS-S[1-4]-\d{3,}$/);
    }
  } else if (type === 'READING_QUESTION_TYPE') {
    if (options?.questionType) {
      patterns.push(
        new RegExp(
          `^${escapeRegex(prefixForUnitType(type, options))}\\d{3,}$`,
        ),
      );
    } else {
      patterns.push(/^PRA-REA-Q\d{3,}$/);
      patterns.push(/^PRA-REA-Q-[A-Z0-9]+-\d{3,}$/);
    }
  } else if (type === 'LISTENING_QUESTION_TYPE') {
    if (options?.questionType) {
      patterns.push(
        new RegExp(
          `^${escapeRegex(prefixForUnitType(type, options))}\\d{3,}$`,
        ),
      );
    } else {
      patterns.push(/^PRA-LIS-Q\d{3,}$/);
      patterns.push(/^PRA-LIS-Q-[A-Z0-9]+-\d{3,}$/);
    }
  } else {
    const prefix = prefixForUnitType(type);
    patterns.push(new RegExp(`^${escapeRegex(prefix)}\\d{3,}$`));
  }

  if (!patterns.some((pattern) => pattern.test(normalized))) {
    const examplePrefix = prefixForUnitType(type, options);
    throw new Error(
      `Practice code must match ${examplePrefix}### (e.g. ${examplePrefix}001).`,
    );
  }
}

export function assertWritingPromptCode(code: string, taskNumber: number): void {
  const prefix = `PRA-WRI-T${taskNumber}-`;
  const normalized = code.trim().toUpperCase();
  const pattern = new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\d{3,}$`);
  if (!pattern.test(normalized)) {
    throw new Error(
      `Writing prompt code must match ${prefix}### (e.g. ${prefix}001).`,
    );
  }
}

export function passagePartFromPracticeContent(
  type: string,
  content: unknown,
): number | null {
  if (!content || typeof content !== "object") return null;
  const c = content as Record<string, unknown>;
  if (type === "READING_PASSAGE" || type === "READING_QUESTION_TYPE") {
    const passages = c.passages;
    if (Array.isArray(passages) && passages[0] && typeof passages[0] === "object") {
      const part = (passages[0] as { part?: number }).part;
      return typeof part === "number" ? part : null;
    }
  }
  if (type === "LISTENING_SECTION" || type === "LISTENING_QUESTION_TYPE") {
    const parts = c.parts;
    if (Array.isArray(parts) && parts[0] && typeof parts[0] === "object") {
      const part = (parts[0] as { part?: number }).part;
      return typeof part === "number" ? part : null;
    }
  }
  return null;
}

function arr<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function gapsInInlineNodes(nodes: unknown): number[] {
  const nums: number[] = [];
  for (const node of arr(nodes as unknown[])) {
    if (typeof node === 'object' && node !== null && 'n' in node && !('type' in node)) {
      nums.push(Number((node as { n: number }).n));
    }
  }
  return nums;
}

function gapsInCompletionLines(lines: unknown): number[] {
  const nums: number[] = [];
  for (const line of arr(lines as { nodes?: unknown[] }[])) {
    nums.push(...gapsInInlineNodes(line?.nodes));
  }
  return nums;
}

function gapsInGroup(group: Record<string, unknown>): number[] {
  switch (group.type) {
    case 'note_completion':
    case 'form_completion':
    case 'summary_completion':
    case 'summary_completion_list':
    case 'sentence_completion':
      return gapsInCompletionLines(group.lines);
    case 'table_completion':
      return arr(group.rows as unknown[]).flatMap((row) =>
        arr(row as unknown[]).flatMap((cell) =>
          gapsInInlineNodes(cell as unknown[]),
        ),
      );
    case 'mcq_single':
    case 'tfng':
    case 'yng':
    case 'short_answer':
    case 'matching':
    case 'matching_headings':
    case 'matching_information':
    case 'matching_features':
      return arr(group.questions as { n?: number }[])
        .map((q) => q.n)
        .filter((n): n is number => typeof n === 'number');
    case 'mcq_multi':
      if (group.selectionMode === 'per_question') {
        return arr(group.numbers as number[]);
      }
      return typeof group.from === 'number' ? [group.from] : arr(group.numbers as number[]).slice(0, 1);
    case 'mcq_choose_n':
      return typeof group.from === 'number' ? [group.from] : [1];
    case 'flowchart_completion':
      return gapsInCompletionLines(group.steps);
    case 'instruction_screen':
      return [];
    case 'map_labeling':
      if (group.layoutMode === 'place_list') {
        return arr(group.questions as { n?: number }[])
          .map((q) => q.n)
          .filter((n): n is number => typeof n === 'number');
      }
      return arr(group.zones as { n?: number }[])
        .map((z) => z.n)
        .filter((n): n is number => typeof n === 'number');
    default:
      return [];
  }
}

function countGroups(groups: unknown): number {
  if (!Array.isArray(groups)) return 0;
  let count = 0;
  for (const g of groups) {
    if (!g || typeof g !== 'object') continue;
    count += gapsInGroup(g as Record<string, unknown>).length;
  }
  return count;
}

export function countQuestionsInContent(
  skill: ExamSkill,
  content: unknown,
): number {
  if (!content || typeof content !== 'object') return 0;
  const c = content as Record<string, unknown>;

  if (skill === ExamSkill.READING && Array.isArray(c.passages)) {
    let count = 0;
    for (const p of c.passages) {
      if (p && typeof p === 'object') {
        count += countGroups((p as { groups?: unknown }).groups);
      }
    }
    return count;
  }

  if (skill === ExamSkill.LISTENING && Array.isArray(c.parts)) {
    let count = 0;
    for (const p of c.parts) {
      if (p && typeof p === 'object') {
        count += countGroups((p as { groups?: unknown }).groups);
      }
    }
    return count;
  }

  return 0;
}

export function wrapReadingPassageContent(passage: object): object {
  return {
    testId: 'practice',
    title: 'Practice Reading',
    totalQuestions: 0,
    durationMinutes: 20,
    passages: [passage],
  };
}

export function wrapListeningPartContent(part: object): object {
  return {
    testId: 'practice',
    title: 'Practice Listening',
    totalQuestions: 0,
    durationMinutes: 10,
    parts: [part],
    audioTracks: [],
  };
}
