import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreditTxnType,
  InstitutionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InstitutionMockSetsService } from '../institution-mock-sets/institution-mock-sets.service';
import { TelegramService } from '../telegram/telegram.service';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { PatchInstitutionDto } from './dto/patch-institution.dto';

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminInstitutionsService implements OnModuleInit {
  private readonly logger = new Logger(AdminInstitutionsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private audit: AuditService,
    private config: ConfigService,
    private telegram: TelegramService,
    private mockSets: InstitutionMockSetsService,
  ) {}

  /** One-time fix: rejected applications were previously stored as SUSPENDED. */
  async onModuleInit(): Promise<void> {
    const { count } = await this.prisma.institution.updateMany({
      where: {
        status: InstitutionStatus.SUSPENDED,
        approvedAt: null,
        admins: { none: {} },
      },
      data: { status: InstitutionStatus.REJECTED },
    });
    if (count > 0) {
      this.logger.log(
        `Migrated ${count} rejected application(s) from SUSPENDED to REJECTED`,
      );
    }
  }

  private appUrl(): string {
    return this.config
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }

  private async mapRow(
    institutionId: string,
    applicationSource?: string | null,
  ) {
    const inst = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      include: {
        _count: {
          select: {
            students: true,
            teachers: true,
            enrollments: true,
            mockSetGrants: true,
          },
        },
        admins: { select: { id: true, name: true, email: true, emailVerifiedAt: true } },
      },
    });
    if (!inst) throw new NotFoundException('Institution not found');
    return {
      id: inst.id,
      name: inst.name,
      slug: inst.slug,
      status: inst.status.toLowerCase(),
      city: inst.city,
      contactName: inst.contactName,
      contactEmail: inst.contactEmail,
      contactPhone: inst.contactPhone,
      wholesalePrice: inst.wholesalePrice,
      currency: inst.currency,
      creditBalance: inst.creditBalance,
      grantedSetCount: inst._count.mockSetGrants,
      students: inst._count.students,
      examiners: inst._count.teachers,
      enrollments: inst._count.enrollments,
      applicationSource: applicationSource ?? null,
      owner: inst.admins[0]
        ? {
            id: inst.admins[0].id,
            name: inst.admins[0].name,
            email: inst.admins[0].email,
            activated: inst.admins[0].emailVerifiedAt != null,
          }
        : null,
      approvedAt: inst.approvedAt,
      createdAt: inst.createdAt,
    };
  }

  private async applicationSources(
    ids: string[],
  ): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const logs = await this.prisma.auditLog.findMany({
      where: {
        entity: 'institution',
        action: AuditAction.INSTITUTION_APPLICATION,
        entityId: { in: ids },
      },
      select: { entityId: true, metadata: true },
      orderBy: { createdAt: 'asc' },
    });
    const map = new Map<string, string>();
    for (const log of logs) {
      if (!log.entityId) continue;
      const meta = log.metadata as { source?: string } | null;
      if (meta?.source) map.set(log.entityId, meta.source);
    }
    return map;
  }

  async list(status?: string) {
    const normalized = status?.toUpperCase();
    const where =
      normalized === 'PENDING' ||
      normalized === 'ACTIVE' ||
      normalized === 'SUSPENDED' ||
      normalized === 'REJECTED'
        ? { status: normalized as InstitutionStatus }
        : {};
    const rows = await this.prisma.institution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const sources = await this.applicationSources(rows.map((r) => r.id));
    return Promise.all(
      rows.map((r) => this.mapRow(r.id, sources.get(r.id) ?? null)),
    );
  }

  async applications() {
    return this.list('PENDING');
  }

  async getOne(id: string) {
    return this.mapRow(id);
  }

  async approve(id: string, actorId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    if (institution.status === InstitutionStatus.ACTIVE) {
      throw new BadRequestException('Institution is already active');
    }

    const email = institution.contactEmail.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException(
        'A user already exists with this contact email. Use a different owner email.',
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const passwordResetToken = createHash('sha256').update(rawToken).digest('hex');
    const passwordResetExpires = new Date(Date.now() + SETUP_TOKEN_TTL_MS);
    const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.institution.update({
        where: { id },
        data: { status: InstitutionStatus.ACTIVE, approvedAt: new Date() },
      });
      await tx.user.create({
        data: {
          email,
          name: institution.contactName,
          passwordHash,
          role: UserRole.INSTITUTION,
          institutionId: id,
          passwordResetToken,
          passwordResetExpires,
        },
      });
    });

    const setupUrl = `${this.appUrl()}/reset-password?token=${rawToken}`;
    void this.mail
      .sendInstitutionApprovedEmail(
        email,
        institution.contactName,
        institution.name,
        setupUrl,
      )
      .catch(() => undefined);

    // Applicants who applied via the bot get an immediate Telegram nudge to
    // check their email for the activation link. Marketing-site leads may not
    // have a chat id — skip silently in that case.
    if (institution.telegramChatId) {
      void this.telegram
        .notifyChat(
          institution.telegramChatId,
          `🎉 Great news! Your application for <b>${institution.name}</b> has been approved.\n\n` +
            `Please check <b>${email}</b> for a link to set your password and open your institution panel.\n\n` +
            `If you don’t see it, look in spam / promotions — the link is valid for 24 hours.`,
        )
        .catch((err) =>
          this.logger.warn(
            `Telegram approval notify failed: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_INSTITUTION_APPROVE,
      entity: 'institution',
      entityId: id,
      metadata: { email },
    });

    return this.mapRow(id);
  }

  async reject(id: string, actorId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    if (institution.status !== InstitutionStatus.PENDING) {
      throw new BadRequestException('Only pending applications can be rejected');
    }

    await this.prisma.institution.update({
      where: { id },
      data: { status: InstitutionStatus.REJECTED },
    });

    const email = institution.contactEmail.trim().toLowerCase();
    void this.mail
      .sendInstitutionRejectedEmail(
        email,
        institution.contactName,
        institution.name,
      )
      .catch(() => undefined);

    if (institution.telegramChatId) {
      void this.telegram
        .notifyChat(
          institution.telegramChatId,
          `Thank you for your interest in partnering with iTestU.\n\n` +
            `After review we’re unable to approve <b>${institution.name}</b> at this time. ` +
            `You can reply here or email <b>institutions@itestu.uz</b> if you’d like more detail.\n\n` +
            `You may submit a new application later with updated information.`,
        )
        .catch((err) =>
          this.logger.warn(
            `Telegram rejection notify failed: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_INSTITUTION_REJECT,
      entity: 'institution',
      entityId: id,
    });

    return this.mapRow(id);
  }

  async patch(id: string, dto: PatchInstitutionDto, actorId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });
    if (!institution) throw new NotFoundException('Institution not found');

    let contactEmail: string | undefined;
    if (dto.contactEmail) {
      contactEmail = dto.contactEmail.trim().toLowerCase();
      if (contactEmail !== institution.contactEmail) {
        // The owner account is created from this email on approval — keep it
        // free of any existing user and any other institution's application.
        const [userClash, instClash] = await Promise.all([
          this.prisma.user.findUnique({
            where: { email: contactEmail },
            select: { id: true },
          }),
          this.prisma.institution.findFirst({
            where: { contactEmail, id: { not: id } },
            select: { id: true },
          }),
        ]);
        if (userClash) {
          throw new ConflictException(
            'A user already exists with this email. Choose a different owner email.',
          );
        }
        if (instClash) {
          throw new ConflictException(
            'Another institution already uses this contact email.',
          );
        }
      }
    }

    await this.prisma.institution.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        contactName: dto.contactName ?? undefined,
        contactEmail,
        contactPhone: dto.contactPhone ?? undefined,
        city: dto.city ?? undefined,
        wholesalePrice: dto.wholesalePrice ?? undefined,
        status: dto.status ? (dto.status as InstitutionStatus) : undefined,
      },
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_INSTITUTION_UPDATE,
      entity: 'institution',
      entityId: id,
      metadata: { ...dto },
    });

    return this.mapRow(id);
  }

  async adjustCredits(id: string, dto: AdjustCreditsDto, actorId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    if (
      institution.status !== InstitutionStatus.ACTIVE &&
      institution.status !== InstitutionStatus.SUSPENDED
    ) {
      throw new BadRequestException(
        'Credits can only be adjusted for active or suspended partners',
      );
    }

    const newBalance = institution.creditBalance + dto.delta;
    if (newBalance < 0) {
      throw new BadRequestException('Adjustment would make the balance negative');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.institution.update({
        where: { id },
        data: { creditBalance: newBalance },
      });
      await tx.institutionCreditTxn.create({
        data: {
          institutionId: id,
          type: CreditTxnType.ADJUSTMENT,
          delta: dto.delta,
          balanceAfter: updated.creditBalance,
          note: dto.note ?? 'Admin adjustment',
        },
      });
    });

    await this.audit.log({
      userId: actorId,
      action: AuditAction.ADMIN_INSTITUTION_CREDIT_ADJUST,
      entity: 'institution',
      entityId: id,
      metadata: { delta: dto.delta, note: dto.note },
    });

    return this.mapRow(id);
  }

  listMockSetGrants(id: string) {
    return this.mockSets.listGrants(id);
  }

  listGrantableMockSets(id: string) {
    return this.mockSets.listAvailableSetsForGrant(id);
  }

  grantMockSet(
    id: string,
    setId: string,
    actorId: string,
    note?: string,
  ) {
    return this.mockSets.grantSet(id, setId, actorId, note);
  }

  revokeMockSetGrant(id: string, setId: string, actorId: string) {
    return this.mockSets.revokeGrant(id, setId, actorId);
  }
}
