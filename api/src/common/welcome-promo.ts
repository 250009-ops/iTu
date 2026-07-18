import { ExamType, PrismaClient } from '@prisma/client';

export const WELCOME_PROMO_WINDOW_DAYS = 30;

export type WelcomePromoSkill = 'listening' | 'reading';

export type WelcomePromoProfile = {
  welcomeListeningClaimedAt: Date | null;
  welcomeReadingClaimedAt: Date | null;
};

export type WelcomePromoUser = {
  createdAt: Date;
};

export type WelcomePromoDashboardItem = {
  skill: WelcomePromoSkill;
  title: string;
  description: string;
  packageId: string;
  eligible: boolean;
  claimed: boolean;
  expiresAt: string;
};

const PROMO_COPY: Record<
  WelcomePromoSkill,
  { title: string; description: string }
> = {
  listening: {
    title: 'Free Listening mock',
    description:
      '40 questions · auto-scored band · official computer-delivered format',
  },
  reading: {
    title: 'Free Reading mock',
    description:
      'Academic passages · auto-scored band · official computer-delivered format',
  },
};

export function welcomePromoExpiresAt(userCreatedAt: Date): Date {
  const expires = new Date(userCreatedAt);
  expires.setDate(expires.getDate() + WELCOME_PROMO_WINDOW_DAYS);
  return expires;
}

export function isWithinWelcomePromoWindow(
  userCreatedAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() < welcomePromoExpiresAt(userCreatedAt).getTime();
}

export function isWelcomePromoClaimed(
  profile: WelcomePromoProfile,
  skill: WelcomePromoSkill,
): boolean {
  return skill === 'listening'
    ? profile.welcomeListeningClaimedAt != null
    : profile.welcomeReadingClaimedAt != null;
}

export function isWelcomePromoEligibleForSkill(
  profile: WelcomePromoProfile,
  user: WelcomePromoUser,
  skill: WelcomePromoSkill,
  mocksCompleted: number,
  now: Date = new Date(),
): boolean {
  if (mocksCompleted > 0) return false;
  if (!isWithinWelcomePromoWindow(user.createdAt, now)) return false;
  if (isWelcomePromoClaimed(profile, skill)) return false;
  return true;
}

export function isWelcomePromoEligible(
  profile: WelcomePromoProfile,
  user: WelcomePromoUser,
  mocksCompleted: number,
  now: Date = new Date(),
): boolean {
  if (mocksCompleted > 0) return false;
  if (!isWithinWelcomePromoWindow(user.createdAt, now)) return false;
  return (
    !isWelcomePromoClaimed(profile, 'listening') ||
    !isWelcomePromoClaimed(profile, 'reading')
  );
}

export async function resolveWelcomePromoPackage(
  prisma: Pick<PrismaClient, 'mockTestPackage'>,
  examType: ExamType,
  skill: WelcomePromoSkill,
) {
  return prisma.mockTestPackage.findFirst({
    where: {
      isActive: true,
      packageKind: skill,
      mockNumber: 1,
      examType,
    },
    orderBy: { mockNumber: 'asc' },
  });
}

export async function buildWelcomePromosForDashboard(
  prisma: Pick<PrismaClient, 'mockTestPackage'>,
  profile: WelcomePromoProfile & { examType: ExamType },
  user: WelcomePromoUser,
  mocksCompleted: number,
  now: Date = new Date(),
): Promise<WelcomePromoDashboardItem[]> {
  if (!isWelcomePromoEligible(profile, user, mocksCompleted, now)) {
    return [];
  }

  const expiresAt = welcomePromoExpiresAt(user.createdAt).toISOString();
  const skills: WelcomePromoSkill[] = ['listening', 'reading'];
  const promos: WelcomePromoDashboardItem[] = [];

  for (const skill of skills) {
    const claimed = isWelcomePromoClaimed(profile, skill);
    const eligible = isWelcomePromoEligibleForSkill(
      profile,
      user,
      skill,
      mocksCompleted,
      now,
    );
    if (!eligible) continue;

    const pkg = await resolveWelcomePromoPackage(
      prisma,
      profile.examType,
      skill,
    );
    if (!pkg) continue;

    const copy = PROMO_COPY[skill];
    promos.push({
      skill,
      title: copy.title,
      description: copy.description,
      packageId: pkg.id,
      eligible,
      claimed,
      expiresAt,
    });
  }

  return promos;
}

export function welcomePromoClaimField(
  skill: WelcomePromoSkill,
): 'welcomeListeningClaimedAt' | 'welcomeReadingClaimedAt' {
  return skill === 'listening'
    ? 'welcomeListeningClaimedAt'
    : 'welcomeReadingClaimedAt';
}
