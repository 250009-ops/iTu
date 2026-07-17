import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../types/request-user';

/** Tickets routed to a centre admin inbox (inst-student / inst-examiner). */
export async function resolveCentreTicketInstitutionId(
  prisma: PrismaService,
  user: RequestUser,
): Promise<string | null> {
  if (user.role === UserRole.INSTITUTION) {
    return null;
  }

  if (user.role === UserRole.STUDENT && user.studentProfileId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: user.studentProfileId },
      select: { institutionId: true },
    });
    return profile?.institutionId ?? null;
  }

  if (user.role === UserRole.TEACHER && user.teacherProfileId) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { id: user.teacherProfileId },
      select: { institutionId: true },
    });
    return profile?.institutionId ?? null;
  }

  return null;
}

export function helpPathForReporter(
  role: UserRole,
  centreMember: boolean,
): string {
  if (role === UserRole.INSTITUTION) return '/institution/help';
  if (role === UserRole.ADMIN) return '/admin/help';
  if (role === UserRole.TEACHER) {
    return centreMember ? '/inst-examiner/help' : '/teacher/help';
  }
  if (role === UserRole.STUDENT) {
    return centreMember ? '/inst-student/help' : '/student/help';
  }
  return '/student/help';
}

export async function isCentreMember(
  prisma: PrismaService,
  user: RequestUser,
): Promise<boolean> {
  const institutionId = await resolveCentreTicketInstitutionId(prisma, user);
  return institutionId != null;
}
