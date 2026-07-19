import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestUser } from '../../common/types/request-user';
import { requireInstitutionId } from '../../common/institution/institution-scope';
import { isWritingReadyForTeacherQueue } from '../../common/grading/writing-queue-visibility';
import {
  teacherCanAccessSpeaking,
  teacherCanAccessWriting,
} from '../../common/teacher-speciality';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_STATUSES = ['ENROLLED', 'IN_PROGRESS', 'AWAITING_RESULTS'] as const;

/** IELTS overall = mean of section bands rounded to the nearest half-band. */
function overallBand(bands: (number | null | undefined)[]): number | null {
  const present = bands.filter((b): b is number => b != null);
  if (present.length === 0) return null;
  const mean = present.reduce((a, b) => a + b, 0) / present.length;
  return Math.round(mean * 2) / 2;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

@Injectable()
export class InstExaminerService {
  constructor(private prisma: PrismaService) {}

  private async requireInstitutionTeacher(user: RequestUser) {
    if (!user.teacherProfileId) {
      throw new ForbiddenException('Examiner profile required');
    }
    const institutionId = requireInstitutionId(user);
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: user.teacherProfileId },
    });
    if (!teacher) throw new NotFoundException('Examiner not found');
    if (teacher.institutionId !== institutionId) {
      throw new ForbiddenException('Not a center-scoped examiner');
    }
    return { teacher, institutionId };
  }

  async overview(user: RequestUser) {
    const { teacher, institutionId } = await this.requireInstitutionTeacher(
      user,
    );

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, name: true },
    });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const studentInclude = {
      sectionAttempt: {
        include: {
          session: {
            include: {
              enrollment: {
                include: {
                  student: { include: { user: true } },
                  package: true,
                },
              },
            },
          },
        },
      },
    } as const;

    const canSpeak = teacherCanAccessSpeaking(teacher.speciality);
    const canWrite = teacherCanAccessWriting(teacher.speciality);

    // Today's speaking sessions for this examiner.
    const speakingToday = canSpeak
      ? await this.prisma.speakingSession.findMany({
          where: {
            teacherId: teacher.id,
            scheduledAt: { gte: today, lt: tomorrow },
          },
          include: { grade: true, ...studentInclude },
          orderBy: { scheduledAt: 'asc' },
        })
      : [];

    // Pending writing submissions assigned to this examiner.
    const writingPending = canWrite
      ? await this.prisma.writingSubmission.findMany({
          where: { teacherId: teacher.id, status: 'PENDING' },
          include: {
            grade: true,
            aiEvaluation: true,
            ...studentInclude,
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const recentGrades = await this.prisma.grade.findMany({
      where: {
        gradedById: teacher.id,
        ...(canSpeak && canWrite
          ? {}
          : canSpeak
            ? { speakingSessionId: { not: null } }
            : { writingSubmissionId: { not: null } }),
      },
      orderBy: { gradedAt: 'desc' },
      take: 6,
      include: {
        writingSubmission: { include: studentInclude },
        speakingSession: { include: studentInclude },
      },
    });

    const avgAllAgg = await this.prisma.grade.aggregate({
      where: { gradedById: teacher.id },
      _avg: { overallBand: true },
    });
    const avgThisMonth = await this.prisma.grade.aggregate({
      where: { gradedById: teacher.id, gradedAt: { gte: monthStart } },
      _avg: { overallBand: true },
    });
    const avgPrevMonth = await this.prisma.grade.aggregate({
      where: {
        gradedById: teacher.id,
        gradedAt: { gte: prevMonthStart, lt: monthStart },
      },
      _avg: { overallBand: true },
    });

    const avgBandGiven =
      avgAllAgg._avg.overallBand != null
        ? round1(avgAllAgg._avg.overallBand)
        : null;
    const avgBandDelta =
      avgThisMonth._avg.overallBand != null &&
      avgPrevMonth._avg.overallBand != null
        ? round1(avgThisMonth._avg.overallBand - avgPrevMonth._avg.overallBand)
        : null;

    const assignmentFilter =
      canSpeak && canWrite
        ? {
            OR: [
              { writingTeacherId: teacher.id },
              { speakingTeacherId: teacher.id },
            ],
          }
        : canWrite
          ? { writingTeacherId: teacher.id }
          : { speakingTeacherId: teacher.id };

    const assignedEnrollments = await this.prisma.enrollment.findMany({
      where: {
        institutionId,
        ...assignmentFilter,
      },
      include: {
        student: { include: { user: true } },
        examSession: { include: { sectionAttempts: true } },
      },
      orderBy: { mockDate: 'asc' },
    });

    type StudentAgg = {
      id: string;
      name: string;
      targetBand: number | null;
      nextMockDate: Date | null;
      sessions: { date: Date; overall: number }[];
    };
    const byStudent = new Map<string, StudentAgg>();
    let activeMocks = 0;

    for (const e of assignedEnrollments) {
      if ((ACTIVE_STATUSES as readonly string[]).includes(e.status)) {
        activeMocks += 1;
      }
      const sid = e.student.id;
      let agg = byStudent.get(sid);
      if (!agg) {
        agg = {
          id: sid,
          name: e.student.user.name,
          targetBand: e.student.targetBand ?? null,
          nextMockDate: null,
          sessions: [],
        };
        byStudent.set(sid, agg);
      }
      if (
        (ACTIVE_STATUSES as readonly string[]).includes(e.status) &&
        (agg.nextMockDate == null || e.mockDate < agg.nextMockDate)
      ) {
        agg.nextMockDate = e.mockDate;
      }
      const overall = overallBand(
        (e.examSession?.sectionAttempts ?? []).map((a) => a.band),
      );
      if (overall != null) {
        agg.sessions.push({ date: e.mockDate, overall });
      }
    }

    const students = [...byStudent.values()].map((s) => {
      const sorted = s.sessions
        .slice()
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      const latestBand = sorted[0]?.overall ?? null;
      const prevBand = sorted[1]?.overall ?? null;
      const delta =
        latestBand != null && prevBand != null
          ? round1(latestBand - prevBand)
          : null;
      return {
        id: s.id,
        name: s.name,
        targetBand: s.targetBand,
        nextMockDate: s.nextMockDate,
        latestBand,
        delta,
      };
    });

    const studentName = (row: {
      sectionAttempt?: {
        session?: {
          enrollment?: { student?: { user?: { name?: string } } };
        };
      } | null;
    }): string =>
      row.sectionAttempt?.session?.enrollment?.student?.user?.name ?? 'Student';

    const enrollmentCode = (row: {
      sectionAttempt?: {
        session?: { enrollment?: { enrollmentCode?: string } };
      } | null;
    }): string | null =>
      row.sectionAttempt?.session?.enrollment?.enrollmentCode ?? null;

    const examTypeLabel = (row: {
      sectionAttempt?: {
        session?: { enrollment?: { package?: { examType?: string } } };
      } | null;
    }): string => {
      const raw =
        row.sectionAttempt?.session?.enrollment?.package?.examType ??
        'ACADEMIC';
      return raw === 'GENERAL_TRAINING' ? 'General' : 'Academic';
    };

    return {
      center: institution,
      examiner: {
        name: user.name,
        rating: teacher.rating,
        totalSessions: teacher.totalSessions,
        speciality: teacher.speciality.toLowerCase(),
      },
      stats: {
        sessionsToday: speakingToday.length,
        sessionsCompletedToday: speakingToday.filter(
          (s) => s.grade != null,
        ).length,
        writingQueue: writingPending.length,
        centreStudents: byStudent.size,
        activeMocks,
        avgBandGiven,
        avgBandDelta,
      },
      todaySpeaking: speakingToday.map((s) => ({
        id: s.id,
        studentName: studentName(s),
        scheduledAt: s.scheduledAt,
        enrollmentCode: enrollmentCode(s),
        graded: s.grade != null,
        band: s.grade?.overallBand ?? null,
      })),
      writingQueue: writingPending.map((w) => {
        const bothTasks = w.task1WordCount > 0 && w.task2WordCount > 0;
        const taskLabel = bothTasks
          ? 'T1 + T2'
          : w.task2WordCount > 0
            ? 'T2 only'
            : 'T1 only';
        const suggested = this.aiEstimate(w.aiEvaluation);
        const urgent =
          w.slaDueAt != null &&
          w.slaDueAt.getTime() - now.getTime() < 2 * 60 * 60 * 1000;
        return {
          id: w.id,
          studentName: studentName(w),
          examType: examTypeLabel(w),
          taskLabel,
          submittedAt: w.createdAt,
          wordCount: w.task1WordCount + w.task2WordCount,
          priority: urgent ? 'urgent' : 'normal',
          aiEstimate: suggested,
          readyToGrade: isWritingReadyForTeacherQueue(w.aiEvaluation),
        };
      }),
      recentlyGraded: recentGrades.map((g) => {
        const isWriting = g.writingSubmission != null;
        const source = g.writingSubmission ?? g.speakingSession;
        return {
          id: g.id,
          studentName: source ? studentName(source) : 'Student',
          type: isWriting ? 'writing' : 'speaking',
          band: g.overallBand,
          gradedAt: g.gradedAt,
        };
      }),
      students,
    };
  }

  private aiEstimate(
    aiEvaluation: {
      task1SuggestedScores: unknown;
      task2SuggestedScores: unknown;
    } | null,
  ): number | null {
    if (!aiEvaluation) return null;
    const collect = (raw: unknown): number[] => {
      if (raw == null || typeof raw !== 'object') return [];
      return Object.values(raw as Record<string, unknown>).filter(
        (v): v is number => typeof v === 'number',
      );
    };
    const scores = [
      ...collect(aiEvaluation.task1SuggestedScores),
      ...collect(aiEvaluation.task2SuggestedScores),
    ];
    if (scores.length === 0) return null;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(mean * 2) / 2;
  }
}
