import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import type { WelcomePromoSkill } from './welcome-promo';

export const REFERRAL_REQUIRED_INVITES = 2;

export type ReferralStatus = {
  code: string;
  sharePath: string;
  inviteCount: number;
  requiredInvites: number;
  rewardUnlocked: boolean;
  rewardClaimed: boolean;
  rewardSkill: WelcomePromoSkill | null;
  recentInvitees: { name: string; joinedAt: string }[];
  pendingEmailInvites: { email: string; sentAt: string }[];
};

/** Max referral invite emails one student may send per rolling 24h. */
export const REFERRAL_EMAIL_DAILY_LIMIT = 10;

/** Minimum gap before re-sending an invite to the same email. */
export const REFERRAL_EMAIL_RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function buildReferralSignupPath(
  code: string,
  inviteeEmail?: string | null,
): string {
  const params = new URLSearchParams({ ref: code });
  const email = inviteeEmail?.trim().toLowerCase();
  if (email) params.set('email', email);
  return `/register/student?${params.toString()}`;
}

function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function generateUniqueReferralCode(
  prisma: Pick<PrismaClient, 'studentProfile'>,
): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    const existing = await prisma.studentProfile.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

export async function ensureStudentReferralCode(
  prisma: Pick<PrismaClient, 'studentProfile'>,
  studentProfileId: string,
): Promise<string> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { referralCode: true },
  });
  if (!profile) {
    throw new Error('Student profile not found');
  }
  if (profile.referralCode) return profile.referralCode;

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = await generateUniqueReferralCode(prisma);
    try {
      const updated = await prisma.studentProfile.update({
        where: { id: studentProfileId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      if (updated.referralCode) return updated.referralCode;
    } catch {
      // Unique collision — retry.
    }
  }
  throw new Error('Could not assign a referral code');
}

export async function resolveReferrerByCode(
  prisma: Pick<PrismaClient, 'studentProfile'>,
  rawCode: string | undefined | null,
): Promise<{ id: string } | null> {
  if (!rawCode) return null;
  const code = normalizeReferralCode(rawCode);
  if (code.length < 4 || code.length > 32) return null;

  return prisma.studentProfile.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
}

export async function buildReferralStatus(
  prisma: Pick<PrismaClient, 'studentProfile' | 'studentReferralInvite'>,
  studentProfileId: string,
): Promise<ReferralStatus> {
  const code = await ensureStudentReferralCode(prisma, studentProfileId);
  const [profile, pendingInvites] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: {
        referralRewardClaimedAt: true,
        referralRewardSkill: true,
        referrals: {
          select: {
            createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
        _count: { select: { referrals: true } },
      },
    }),
    prisma.studentReferralInvite.findMany({
      where: {
        inviterId: studentProfileId,
        acceptedAt: null,
      },
      select: { email: true, sentAt: true },
      orderBy: { sentAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!profile) {
    throw new Error('Student profile not found');
  }

  const inviteCount = profile._count.referrals;
  const rewardClaimed = profile.referralRewardClaimedAt != null;
  const rewardSkill =
    profile.referralRewardSkill === 'listening' ||
    profile.referralRewardSkill === 'reading'
      ? profile.referralRewardSkill
      : null;

  return {
    code,
    sharePath: buildReferralSignupPath(code),
    inviteCount,
    requiredInvites: REFERRAL_REQUIRED_INVITES,
    rewardUnlocked: inviteCount >= REFERRAL_REQUIRED_INVITES,
    rewardClaimed,
    rewardSkill,
    recentInvitees: profile.referrals.map((r) => ({
      name: r.user.name,
      joinedAt: r.createdAt.toISOString(),
    })),
    pendingEmailInvites: pendingInvites.map((invite) => ({
      email: invite.email,
      sentAt: invite.sentAt.toISOString(),
    })),
  };
}

/**
 * Resolve inviter from signup `ref` code, or fall back to a pending email invite
 * for this address (covers email clients that strip query params).
 */
export async function resolveReferrerForSignup(
  prisma: Pick<PrismaClient, 'studentProfile' | 'studentReferralInvite'>,
  rawCode: string | undefined | null,
  signupEmail: string,
): Promise<{ id: string } | null> {
  const byCode = await resolveReferrerByCode(prisma, rawCode);
  if (byCode) return byCode;

  const email = signupEmail.trim().toLowerCase();
  if (!email) return null;

  const pending = await prisma.studentReferralInvite.findFirst({
    where: {
      email,
      acceptedAt: null,
      inviteeId: null,
    },
    orderBy: { sentAt: 'desc' },
    select: { inviterId: true },
  });
  return pending ? { id: pending.inviterId } : null;
}

export async function markReferralInviteAccepted(
  prisma: Pick<PrismaClient, 'studentReferralInvite'>,
  inviterId: string,
  inviteeId: string,
  signupEmail: string,
): Promise<void> {
  const email = signupEmail.trim().toLowerCase();
  if (!email) return;

  const invite = await prisma.studentReferralInvite.findFirst({
    where: {
      inviterId,
      email,
      acceptedAt: null,
    },
    select: { id: true },
  });
  if (!invite) return;

  await prisma.studentReferralInvite.update({
    where: { id: invite.id },
    data: {
      acceptedAt: new Date(),
      inviteeId,
    },
  });
}
