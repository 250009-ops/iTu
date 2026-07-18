/**
 * Reset Alex Johnson to a fresh account with no mocks booked.
 * Run anytime during QA: npm run db:reset-student
 */
import { PrismaClient, SlotStatus } from '@prisma/client';

const STUDENT_EMAIL = 'student@example.com';

const prisma = new PrismaClient();

async function resetFreshStudent() {
  const user = await prisma.user.findUnique({
    where: { email: STUDENT_EMAIL },
    include: { studentProfile: true },
  });

  if (!user?.studentProfile) {
    throw new Error(
      `Student "${STUDENT_EMAIL}" not found. Run npm run db:seed first.`,
    );
  }

  const studentId = user.studentProfile.id;
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: {
      id: true,
      speakingSlotId: true,
      examSession: { select: { id: true } },
    },
  });

  const enrollmentIds = enrollments.map((e) => e.id);
  const sessionIds = enrollments
    .map((e) => e.examSession?.id)
    .filter((id): id is string => Boolean(id));
  const slotIds = enrollments
    .map((e) => e.speakingSlotId)
    .filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    if (sessionIds.length) {
      const attempts = await tx.sectionAttempt.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { id: true },
      });
      const attemptIds = attempts.map((a) => a.id);

      if (attemptIds.length) {
        const writing = await tx.writingSubmission.findMany({
          where: { sectionAttemptId: { in: attemptIds } },
          select: { id: true },
        });
        const speaking = await tx.speakingSession.findMany({
          where: { sectionAttemptId: { in: attemptIds } },
          select: { id: true },
        });

        if (writing.length) {
          await tx.grade.deleteMany({
            where: {
              writingSubmissionId: { in: writing.map((w) => w.id) },
            },
          });
        }
        if (speaking.length) {
          await tx.grade.deleteMany({
            where: {
              speakingSessionId: { in: speaking.map((s) => s.id) },
            },
          });
        }
      }

      await tx.examSession.deleteMany({ where: { id: { in: sessionIds } } });
    }

    if (enrollmentIds.length) {
      await tx.review.deleteMany({
        where: { enrollmentId: { in: enrollmentIds } },
      });
      await tx.supportTicket.deleteMany({
        where: { enrollmentId: { in: enrollmentIds } },
      });

      const orders = await tx.order.findMany({
        where: { studentId },
        select: { id: true },
      });
      if (orders.length) {
        await tx.refund.deleteMany({
          where: { orderId: { in: orders.map((o) => o.id) } },
        });
        await tx.order.deleteMany({ where: { studentId } });
      }

      await tx.enrollment.deleteMany({ where: { studentId } });
    }

    if (slotIds.length) {
      await tx.teacherSlot.updateMany({
        where: { id: { in: slotIds } },
        data: { status: SlotStatus.AVAILABLE },
      });
    }

    await tx.notification.deleteMany({ where: { userId: user.id } });

    await tx.studentProfile.update({
      where: { id: studentId },
      data: {
        publishToLeaderboard: false,
        targetBand: null,
        welcomeListeningClaimedAt: null,
        welcomeReadingClaimedAt: null,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { createdAt: new Date() },
    });
  });

  console.log('Fresh student reset complete.');
  console.log(`Account: ${STUDENT_EMAIL} / ${STUDENT_EMAIL} (Alex Johnson)`);
  console.log('State: no enrollments, orders, or exam sessions.');
  console.log('Next: log in at http://localhost:3000/login and book a mock.');
}

resetFreshStudent()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
