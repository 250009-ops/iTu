import { ExamSkill } from '@prisma/client';

export const EXAM_SKILL_ORDER: ExamSkill[] = [
  ExamSkill.LISTENING,
  ExamSkill.READING,
  ExamSkill.WRITING,
  ExamSkill.SPEAKING,
];

/** Normalize package `skills` JSON into ordered exam skills. */
export function packageExamSkills(skills: unknown): ExamSkill[] {
  if (!Array.isArray(skills)) return [];
  const want = new Set<ExamSkill>();
  for (const entry of skills) {
    const skill = skillIdFromEntry(entry);
    if (skill) want.add(skill);
  }
  return EXAM_SKILL_ORDER.filter((skill) => want.has(skill));
}

function skillIdFromEntry(entry: unknown): ExamSkill | null {
  if (typeof entry === 'string') {
    const upper = entry.toUpperCase();
    if (upper in ExamSkill) return upper as ExamSkill;
    return null;
  }
  if (entry && typeof entry === 'object' && 'id' in entry) {
    const upper = String((entry as { id: unknown }).id).toUpperCase();
    if (upper in ExamSkill) return upper as ExamSkill;
  }
  return null;
}

export function packageIncludesExamSkill(
  skills: unknown,
  skill: ExamSkill,
): boolean {
  return packageExamSkills(skills).includes(skill);
}

export function firstPackageExamSkill(skills: unknown): ExamSkill | null {
  return packageExamSkills(skills)[0] ?? null;
}
