import { ExamSkill, PracticeUnitType } from '@prisma/client';

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

export function prefixForUnitType(type: PracticeUnitType): string {
  switch (type) {
    case 'READING_PASSAGE':
      return 'PRA-REA-P';
    case 'READING_QUESTION_TYPE':
      return 'PRA-REA-Q';
    case 'LISTENING_SECTION':
      return 'PRA-LIS-S';
    case 'LISTENING_QUESTION_TYPE':
      return 'PRA-LIS-Q';
    default:
      return 'PRA-UNK';
  }
}

export async function nextPracticeUnitCode(
  prisma: { practiceUnit: { findMany: (args: object) => Promise<{ code: string }[]> } },
  type: PracticeUnitType,
): Promise<string> {
  const prefix = prefixForUnitType(type);
  const existing = await prisma.practiceUnit.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
    orderBy: { code: 'desc' },
    take: 1,
  });
  let next = 1;
  if (existing[0]) {
    const match = existing[0].code.match(/(\d+)$/);
    if (match) next = Number(match[1]) + 1;
  }
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export async function nextWritingPromptCode(
  prisma: { writingPracticePrompt: { findMany: (args: object) => Promise<{ code: string }[]> } },
  taskNumber: number,
): Promise<string> {
  const prefix = `PRA-WRI-T${taskNumber}-`;
  const existing = await prisma.writingPracticePrompt.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
    orderBy: { code: 'desc' },
    take: 1,
  });
  let next = 1;
  if (existing[0]) {
    const match = existing[0].code.match(/(\d+)$/);
    if (match) next = Number(match[1]) + 1;
  }
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export function countQuestionsInContent(
  skill: ExamSkill,
  content: unknown,
): number {
  if (!content || typeof content !== 'object') return 0;
  const c = content as Record<string, unknown>;
  let count = 0;

  const countGroups = (groups: unknown) => {
    if (!Array.isArray(groups)) return;
    for (const g of groups) {
      if (!g || typeof g !== 'object') continue;
      const group = g as Record<string, unknown>;
      if (group.type === 'instruction_screen') continue;
      if (Array.isArray(group.questions)) count += group.questions.length;
      else if (Array.isArray(group.items)) count += group.items.length;
      else if (Array.isArray(group.statements)) count += group.statements.length;
      else if (Array.isArray(group.steps)) {
        for (const step of group.steps) {
          if (step && typeof step === 'object' && 'gaps' in step) {
            const gaps = (step as { gaps?: unknown[] }).gaps;
            if (Array.isArray(gaps)) count += gaps.length;
          }
        }
      } else if (Array.isArray(group.lines)) {
        for (const line of group.lines) {
          if (line && typeof line === 'object' && 'gaps' in line) {
            const gaps = (line as { gaps?: unknown[] }).gaps;
            if (Array.isArray(gaps)) count += gaps.length;
          }
        }
      }
    }
  };

  if (skill === ExamSkill.READING && Array.isArray(c.passages)) {
    for (const p of c.passages) {
      if (p && typeof p === 'object') {
        countGroups((p as { groups?: unknown }).groups);
      }
    }
  } else if (skill === ExamSkill.LISTENING && Array.isArray(c.parts)) {
    for (const p of c.parts) {
      if (p && typeof p === 'object') {
        countGroups((p as { groups?: unknown }).groups);
      }
    }
  }

  return count;
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
