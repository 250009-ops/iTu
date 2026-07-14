import { InstitutionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Statuses that block a new application for the same owner email. */
export const BLOCKING_INSTITUTION_STATUSES: InstitutionStatus[] = [
  InstitutionStatus.PENDING,
  InstitutionStatus.ACTIVE,
  InstitutionStatus.SUSPENDED,
];

export type InstitutionApplicationInput = {
  name: string;
  slug: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  city?: string | null;
  telegramChatId?: string | null;
};

export type InstitutionApplicationResult =
  | { kind: 'created'; institutionId: string }
  | { kind: 'reopened'; institutionId: string }
  | { kind: 'duplicate_pending' }
  | { kind: 'duplicate_active' };

export async function submitInstitutionApplication(
  prisma: PrismaService,
  input: InstitutionApplicationInput,
): Promise<InstitutionApplicationResult> {
  const contactEmail = input.contactEmail.trim().toLowerCase();

  const blocking = await prisma.institution.findFirst({
    where: {
      contactEmail,
      status: { in: BLOCKING_INSTITUTION_STATUSES },
    },
    select: { id: true, status: true },
  });

  if (blocking) {
    return blocking.status === InstitutionStatus.PENDING
      ? { kind: 'duplicate_pending' }
      : { kind: 'duplicate_active' };
  }

  const rejected = await prisma.institution.findFirst({
    where: { contactEmail, status: InstitutionStatus.REJECTED },
    select: { id: true },
  });

  if (rejected) {
    await prisma.institution.update({
      where: { id: rejected.id },
      data: {
        name: input.name,
        slug: input.slug,
        status: InstitutionStatus.PENDING,
        contactName: input.contactName,
        contactPhone: input.contactPhone ?? null,
        city: input.city ?? null,
        telegramChatId: input.telegramChatId ?? null,
        approvedAt: null,
      },
    });
    return { kind: 'reopened', institutionId: rejected.id };
  }

  const institution = await prisma.institution.create({
    data: {
      name: input.name,
      slug: input.slug,
      status: InstitutionStatus.PENDING,
      contactName: input.contactName,
      contactEmail,
      contactPhone: input.contactPhone ?? null,
      city: input.city ?? null,
      telegramChatId: input.telegramChatId ?? null,
    },
  });

  return { kind: 'created', institutionId: institution.id };
}
