import { ForbiddenException } from '@nestjs/common';
import { TeacherSpeciality } from '@prisma/client';

/** Prisma where-clause for approved teachers matching a booking/marketing skill filter. */
export function teacherSpecialityWhere(
  speciality?: 'writing' | 'speaking' | 'both',
): { speciality?: TeacherSpeciality | { in: TeacherSpeciality[] } } {
  if (!speciality) return {};
  if (speciality === 'both') {
    return { speciality: TeacherSpeciality.BOTH };
  }
  if (speciality === 'writing') {
    return { speciality: { in: [TeacherSpeciality.WRITING, TeacherSpeciality.BOTH] } };
  }
  return { speciality: { in: [TeacherSpeciality.SPEAKING, TeacherSpeciality.BOTH] } };
}

export function teacherCanAccessSpeaking(
  speciality: TeacherSpeciality,
): boolean {
  return (
    speciality === TeacherSpeciality.SPEAKING ||
    speciality === TeacherSpeciality.BOTH
  );
}

export function teacherCanAccessWriting(
  speciality: TeacherSpeciality,
): boolean {
  return (
    speciality === TeacherSpeciality.WRITING ||
    speciality === TeacherSpeciality.BOTH
  );
}

export function assertTeacherSkillAccess(
  speciality: TeacherSpeciality,
  skill: 'speaking' | 'writing',
): void {
  const allowed =
    skill === 'speaking'
      ? teacherCanAccessSpeaking(speciality)
      : teacherCanAccessWriting(speciality);
  if (!allowed) {
    throw new ForbiddenException(
      `Your examiner speciality does not include ${skill}`,
    );
  }
}
