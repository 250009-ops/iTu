import { PrismaService } from '../prisma/prisma.service';

export type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  country: string;
  overallBand: number;
  skillBands: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
  improvementDelta: number;
};

type RankedStudentRow = Omit<LeaderboardEntry, 'rank'>;

/** Build the full opt-in student leaderboard sorted by best overall band. */
export async function buildStudentLeaderboard(
  prisma: PrismaService,
): Promise<RankedStudentRow[]> {
  const students = await prisma.studentProfile.findMany({
    where: {
      publishToLeaderboard: true,
      enrollments: {
        some: { status: 'COMPLETED', resultsStatus: 'RELEASED' },
      },
    },
    include: {
      user: { select: { name: true } },
      enrollments: {
        where: { status: 'COMPLETED' },
        include: {
          examSession: { select: { sectionAttempts: true } },
        },
        orderBy: { mockDate: 'asc' },
      },
    },
  });

  return students
    .map((s) => {
      const overalls: number[] = [];
      let best: Record<string, number> = {};
      let bestOverall = 0;
      for (const e of s.enrollments) {
        const bySkill: Record<string, number> = {};
        for (const a of e.examSession?.sectionAttempts ?? []) {
          if (a.band != null) bySkill[a.skill.toLowerCase()] = a.band;
        }
        const bands = Object.values(bySkill);
        if (!bands.length) continue;
        const overall =
          Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) /
          2;
        overalls.push(overall);
        if (overall >= bestOverall) {
          bestOverall = overall;
          best = bySkill;
        }
      }
      if (!overalls.length) return null;
      const improvement =
        overalls.length > 1
          ? Math.round((overalls[overalls.length - 1] - overalls[0]) * 2) / 2
          : 0;
      return {
        id: s.id,
        name: s.user.name,
        country: s.country ?? '',
        overallBand: bestOverall,
        skillBands: {
          listening: best.listening ?? 0,
          reading: best.reading ?? 0,
          writing: best.writing ?? 0,
          speaking: best.speaking ?? 0,
        },
        improvementDelta: improvement,
      };
    })
    .filter((s): s is RankedStudentRow => s != null)
    .sort((a, b) => b.overallBand - a.overallBand);
}

export function withRanks(rows: RankedStudentRow[]): LeaderboardEntry[] {
  return rows.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function sliceLeaderboard(
  rows: RankedStudentRow[],
  limit: number,
): LeaderboardEntry[] {
  return withRanks(rows.slice(0, limit));
}
