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
