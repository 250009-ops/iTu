import { TeacherSpeciality } from '@prisma/client';
import {
  assertTeacherSkillAccess,
  teacherCanAccessSpeaking,
  teacherCanAccessWriting,
  teacherSpecialityWhere,
} from './teacher-speciality';

describe('teacherSpecialityWhere', () => {
  it('includes BOTH for speaking filter', () => {
    expect(teacherSpecialityWhere('speaking')).toEqual({
      speciality: { in: [TeacherSpeciality.SPEAKING, TeacherSpeciality.BOTH] },
    });
  });

  it('includes BOTH for writing filter', () => {
    expect(teacherSpecialityWhere('writing')).toEqual({
      speciality: { in: [TeacherSpeciality.WRITING, TeacherSpeciality.BOTH] },
    });
  });
});

describe('teacher skill access', () => {
  it('allows speaking-only examiners speaking access only', () => {
    expect(teacherCanAccessSpeaking(TeacherSpeciality.SPEAKING)).toBe(true);
    expect(teacherCanAccessWriting(TeacherSpeciality.SPEAKING)).toBe(false);
  });

  it('allows writing-only examiners writing access only', () => {
    expect(teacherCanAccessWriting(TeacherSpeciality.WRITING)).toBe(true);
    expect(teacherCanAccessSpeaking(TeacherSpeciality.WRITING)).toBe(false);
  });

  it('throws when skill is outside speciality', () => {
    expect(() =>
      assertTeacherSkillAccess(TeacherSpeciality.WRITING, 'speaking'),
    ).toThrow('Your examiner speciality does not include speaking');
  });
});
