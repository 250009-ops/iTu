import { TeacherSpeciality } from '@prisma/client';
import { teacherSpecialityWhere } from './teacher-speciality';

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
