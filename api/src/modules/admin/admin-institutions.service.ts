import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
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
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { PatchInstitutionDto } from './dto/patch-institution.dto';

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminInstitutionsService {
  private readonly logger = new Logger(AdminInstitutionsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  private appUrl(): string {
    return this.config
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }

  private async mapRow(institutionId: string) {
    const inst = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      include: {
        _count: { select: { students: true, teachers: true, enrollments: true } },
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
      students: inst._count.students,
      examiners: inst._count.teachers,
      enrollments: inst._count.enrollments,
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

  async list(status?: string) {
    const normalized = status?.toUpperCase();
    const where =
      normalized === 'PENDING' ||
      normalized === 'ACTIVE' ||
      normalized === 'SUSPENDED'
        ? { status: normalized as InstitutionStatus }
        : {};
    const rows = await this.prisma.institution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return Promise.all(rows.map((r) => this.mapRow(r.id)));
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

    await this.prisma.institution.update({
      where: { id },
      data: { status: InstitutionStatus.SUSPENDED },
    });

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

    await this.prisma.institution.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
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
}
