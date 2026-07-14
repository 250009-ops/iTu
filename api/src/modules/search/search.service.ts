import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { formatMoney } from '../../common/format-money';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';

export type SearchResultItem = {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
  href: string;
};

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, user: RequestUser): Promise<SearchResultItem[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    switch (user.role) {
      case UserRole.ADMIN:
        return this.adminSearch(q);
      case UserRole.TEACHER:
        return this.teacherSearch(q, user);
      case UserRole.STUDENT:
        return this.studentSearch(q, user);
      default:
        return [];
    }
  }

  private async adminSearch(q: string): Promise<SearchResultItem[]> {
    const [enrollments, orders, tests, tickets, sessions] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          OR: [
            { enrollmentCode: { contains: q } },
            { student: { user: { name: { contains: q } } } },
            { student: { user: { email: { contains: q } } } },
          ],
        },
        include: { student: { include: { user: true } } },
        take: 5,
      }),
      this.prisma.order.findMany({
        where: {
          OR: [
            { orderCode: { contains: q } },
            { student: { user: { name: { contains: q } } } },
          ],
        },
        include: { student: { include: { user: true } } },
        take: 5,
      }),
      this.prisma.contentTest.findMany({
        where: {
          OR: [{ code: { contains: q } }, { title: { contains: q } }],
        },
        take: 5,
      }),
      this.prisma.supportTicket.findMany({
        where: {
          OR: [
            { ticketCode: { contains: q } },
            { subject: { contains: q } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        include: { user: true },
        take: 5,
      }),
      this.prisma.examSession.findMany({
        where: {
          OR: [
            { sessionCode: { contains: q } },
            {
              enrollment: {
                student: { user: { name: { contains: q } } },
              },
            },
          ],
        },
        include: {
          enrollment: { include: { student: { include: { user: true } } } },
        },
        take: 5,
      }),
    ]);

    return [
      ...enrollments.map((e) => ({
        type: 'enrollment',
        id: e.id,
        label: e.student.user.name,
        subtitle: `${e.enrollmentCode} · ${e.status}`,
        href: '/admin/enrollments',
      })),
      ...orders.map((o) => ({
        type: 'order',
        id: o.id,
        label: o.orderCode,
        subtitle: `${o.student?.user.name ?? 'Institution'} · ${formatMoney(o.amount, o.currency)}`,
        href: '/admin/orders',
      })),
      ...tests.map((t) => ({
        type: 'content',
        id: t.id,
        label: t.title,
        subtitle: `${t.code} · ${t.type}`,
        href: '/admin/content',
      })),
      ...tickets.map((t) => ({
        type: 'ticket',
        id: t.id,
        label: t.ticketCode,
        subtitle: t.subject,
        href: '/admin/disputes',
      })),
      ...sessions.map((s) => ({
        type: 'session',
        id: s.id,
        label: s.sessionCode,
        subtitle: `${s.enrollment.student.user.name} · ${s.state}`,
        href: '/admin/sessions',
      })),
    ].slice(0, 12);
  }

  private async teacherSearch(
    q: string,
    user: RequestUser,
  ): Promise<SearchResultItem[]> {
    if (!user.teacherProfileId) return [];

    const [writing, speaking] = await Promise.all([
      this.prisma.writingSubmission.findMany({
        where: {
          teacherId: user.teacherProfileId,
          sectionAttempt: {
            session: {
              enrollment: {
                student: {
                  user: {
                    OR: [{ name: { contains: q } }, { email: { contains: q } }],
                  },
                },
              },
            },
          },
        },
        include: {
          sectionAttempt: {
            include: {
              session: {
                include: {
                  enrollment: {
                    include: { student: { include: { user: true } } },
                  },
                },
              },
            },
          },
        },
        take: 6,
      }),
      this.prisma.speakingSession.findMany({
        where: {
          teacherId: user.teacherProfileId,
          sectionAttempt: {
            session: {
              enrollment: {
                student: {
                  user: {
                    OR: [{ name: { contains: q } }, { email: { contains: q } }],
                  },
                },
              },
            },
          },
        },
        include: {
          sectionAttempt: {
            include: {
              session: {
                include: {
                  enrollment: {
                    include: { student: { include: { user: true } } },
                  },
                },
              },
            },
          },
        },
        take: 6,
      }),
    ]);

    return [
      ...writing.map((w) => ({
        type: 'grading',
        id: w.id,
        label: w.sectionAttempt.session.enrollment.student.user.name,
        subtitle: `Writing · ${w.status}`,
        href: `/teacher/grading/${w.id}`,
      })),
      ...speaking.map((s) => ({
        type: 'speaking',
        id: s.id,
        label: s.sectionAttempt.session.enrollment.student.user.name,
        subtitle: `Speaking · ${s.status}`,
        href: '/teacher/speaking',
      })),
    ].slice(0, 10);
  }

  private async studentSearch(
    q: string,
    user: RequestUser,
  ): Promise<SearchResultItem[]> {
    if (!user.studentProfileId) return [];

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId: user.studentProfileId,
        OR: [
          { enrollmentCode: { contains: q } },
          { package: { title: { contains: q } } },
        ],
      },
      include: { package: true, examSession: true },
      take: 8,
    });

    return enrollments.map((e) => ({
      type: 'enrollment',
      id: e.id,
      label: e.package.title,
      subtitle: `${e.enrollmentCode} · ${e.mockDate.toLocaleDateString()}`,
      href: '/student/mock-day',
    }));
  }
}
