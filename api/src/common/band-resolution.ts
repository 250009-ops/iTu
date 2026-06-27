import { ExamSkill } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export async function lookupBandFromRawScore(
  prisma: PrismaService,
  skill: ExamSkill,
  rawScore: number,
): Promise<number | null> {
  const row = await prisma.bandConversionTable.findFirst({
    where: { skill, rawScore, isActive: true },
    orderBy: { rawScore: 'desc' },
  });
  if (row?.band != null) return row.band;

  const nearest = await prisma.bandConversionTable.findFirst({
    where: { skill, rawScore: { lte: rawScore }, isActive: true },
    orderBy: { rawScore: 'desc' },
  });
  if (nearest?.band != null) return nearest.band;
  if (rawScore >= 0) return 2.5;
  return null;
}

export async function resolveAttemptBand(
  prisma: PrismaService,
  attempt: {
    skill: string;
    band: number | null;
    rawScore: number | null;
  },
): Promise<number | null> {
  if (attempt.band != null) return attempt.band;
  const skill = attempt.skill as ExamSkill;
  if (
    (skill === ExamSkill.LISTENING || skill === ExamSkill.READING) &&
    attempt.rawScore != null
  ) {
    return lookupBandFromRawScore(prisma, skill, attempt.rawScore);
  }
  return null;
}

export function overallBandFromSkillBands(
  bands: (number | null | undefined)[],
): number | null {
  const values = bands.filter((b): b is number => b != null);
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 2) / 2;
}

export function mockStartDateTime(mockDate: Date, mockTime: string): Date {
  const start = new Date(mockDate);
  const [hours, minutes] = mockTime.split(':').map((part) => parseInt(part, 10));
  start.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return start;
}

export function countdownParts(target: Date, now = new Date()) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  return {
    daysUntil: Math.floor(diff / (24 * 60 * 60 * 1000)),
    hoursUntil: Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
    minutesUntil: Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)),
    started: target.getTime() <= now.getTime(),
  };
}
