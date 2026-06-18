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
  const want = new Set(
    skills.map((s) => String(s).toUpperCase()).filter((s) => s in ExamSkill),
  );
  return EXAM_SKILL_ORDER.filter((skill) => want.has(skill));
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
