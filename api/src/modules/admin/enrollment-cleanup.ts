import { Prisma, PrismaClient, SlotStatus } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Removes enrollments (and their exam sessions, orders, reviews, tickets) matching
 * `where`. Speaking slots are returned to AVAILABLE.
 */
export async function purgeEnrollments(
  db: Db,
  where: Prisma.EnrollmentWhereInput,
): Promise<{ enrollments: number; orders: number; sessions: number }> {
  const enrollments = await db.enrollment.findMany({
    where,
    select: {
      id: true,
      speakingSlotId: true,
      examSession: { select: { id: true } },
      order: { select: { id: true } },
    },
  });

  if (enrollments.length === 0) {
    return { enrollments: 0, orders: 0, sessions: 0 };
  }

  const enrollmentIds = enrollments.map((e) => e.id);
  const sessionIds = enrollments
    .map((e) => e.examSession?.id)
    .filter((id): id is string => Boolean(id));
  const slotIds = enrollments
    .map((e) => e.speakingSlotId)
    .filter((id): id is string => Boolean(id));
  const orderIds = enrollments
    .map((e) => e.order?.id)
    .filter((id): id is string => Boolean(id));

  if (sessionIds.length) {
    const attempts = await db.sectionAttempt.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { id: true },
    });
    const attemptIds = attempts.map((a) => a.id);

    if (attemptIds.length) {
      const writing = await db.writingSubmission.findMany({
        where: { sectionAttemptId: { in: attemptIds } },
        select: { id: true },
      });
      const speaking = await db.speakingSession.findMany({
        where: { sectionAttemptId: { in: attemptIds } },
        select: { id: true },
      });

      if (writing.length) {
        await db.grade.deleteMany({
          where: { writingSubmissionId: { in: writing.map((w) => w.id) } },
        });
      }
      if (speaking.length) {
        await db.grade.deleteMany({
          where: { speakingSessionId: { in: speaking.map((s) => s.id) } },
        });
      }
    }

    await db.examSession.deleteMany({ where: { id: { in: sessionIds } } });
  }

  await db.review.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
  await db.supportTicket.deleteMany({
    where: { enrollmentId: { in: enrollmentIds } },
  });

  if (orderIds.length) {
    await db.refund.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  await db.enrollment.deleteMany({ where: { id: { in: enrollmentIds } } });

  if (slotIds.length) {
    await db.teacherSlot.updateMany({
      where: { id: { in: slotIds } },
      data: { status: SlotStatus.AVAILABLE },
    });
  }

  return {
    enrollments: enrollmentIds.length,
    orders: orderIds.length,
    sessions: sessionIds.length,
  };
}
