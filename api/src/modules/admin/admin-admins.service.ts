import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import {
  ADMIN_PERMISSION_CATALOG,
  adminHasFullAccess,
  isMainAdminEmail,
  normalizeEmail,
  resolveAdminPermissions,
  sanitizeAdminPermissions,
} from '../../common/admin-permissions/admin-permissions';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { MailService } from '../../common/mail/mail.service';
import { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const SETUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminAdminsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private audit: AuditService,
  ) {}

  private mainAdminEmail() {
    return this.config.get<string>('MAIN_ADMIN_EMAIL');
  }

  private assertMainAdmin(actor: RequestUser) {
    if (
      actor.isMainAdmin ||
      isMainAdminEmail(actor.email, this.mainAdminEmail())
    ) {
      return;
    }
    throw new ForbiddenException(
      'Only the main admin can manage team admins',
    );
  }

  private appUrl() {
    return this.config
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/$/, '');
  }

  private serializeAdmin(user: {
    id: string;
    email: string;
    name: string;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    adminProfile: {
      id: string;
      active: boolean;
      permissions: unknown;
      invitedById: string | null;
      createdAt: Date;
      updatedAt: Date;
      invitedBy?: { id: string; name: string; email: string } | null;
    } | null;
  }) {
    const isMain = isMainAdminEmail(user.email, this.mainAdminEmail());
    const permissions = resolveAdminPermissions({
      email: user.email,
      mainAdminEmail: this.mainAdminEmail(),
      profile: user.adminProfile,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isMainAdmin: isMain,
      fullAccess: adminHasFullAccess(permissions),
      permissions,
      active: isMain ? true : (user.adminProfile?.active ?? true),
      pendingInvite: !user.emailVerifiedAt,
      invitedBy: user.adminProfile?.invitedBy
        ? {
            id: user.adminProfile.invitedBy.id,
            name: user.adminProfile.invitedBy.name,
            email: user.adminProfile.invitedBy.email,
          }
        : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: (
        user.adminProfile?.updatedAt ?? user.createdAt
      ).toISOString(),
    };
  }

  catalog() {
    return {
      permissions: ADMIN_PERMISSION_CATALOG,
      mainAdminEmail: normalizeEmail(
        this.mainAdminEmail() || 'serkinov393@gmail.com',
      ),
    };
  }

  async list(actor: RequestUser) {
    this.assertMainAdmin(actor);

    const users = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      include: {
        adminProfile: {
          include: {
            invitedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      admins: users.map((user) => this.serializeAdmin(user)),
      catalog: ADMIN_PERMISSION_CATALOG,
    };
  }

  async invite(actor: RequestUser, dto: InviteAdminDto) {
    this.assertMainAdmin(actor);

    const email = normalizeEmail(dto.email);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    if (isMainAdminEmail(email, this.mainAdminEmail())) {
      throw new BadRequestException(
        'The main admin account cannot be invited again',
      );
    }

    const permissions = sanitizeAdminPermissions(dto.permissions);
    if (permissions.length === 0) {
      throw new BadRequestException(
        'Select at least one capability for the invited admin',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { adminProfile: true },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const rawToken = randomBytes(32).toString('hex');
    const passwordResetToken = createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const passwordResetExpires = new Date(Date.now() + SETUP_TOKEN_TTL_MS);
    const passwordHash = await bcrypt.hash(randomBytes(16).toString('hex'), 12);

    const created = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: UserRole.ADMIN,
        passwordResetToken,
        passwordResetExpires,
        adminProfile: {
          create: {
            permissions,
            invitedById: actor.id,
            active: true,
          },
        },
      },
      include: {
        adminProfile: {
          include: {
            invitedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const setupUrl = `${this.appUrl()}/reset-password?token=${rawToken}`;
    void this.mail
      .sendAdminInviteEmail(email, name, setupUrl)
      .catch(() => undefined);

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.ADMIN_TEAM_INVITE,
      entity: 'admin_profile',
      entityId: created.adminProfile?.id ?? created.id,
      metadata: { email, permissions },
    });

    return {
      invited: true,
      admin: this.serializeAdmin(created),
    };
  }

  async update(actor: RequestUser, adminUserId: string, dto: UpdateAdminDto) {
    this.assertMainAdmin(actor);

    const user = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      include: {
        adminProfile: {
          include: {
            invitedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    if (isMainAdminEmail(user.email, this.mainAdminEmail())) {
      throw new BadRequestException(
        'The main admin cannot be modified or demoted',
      );
    }

    if (dto.permissions !== undefined) {
      const permissions = sanitizeAdminPermissions(dto.permissions);
      if (permissions.length === 0) {
        throw new BadRequestException(
          'Select at least one capability for the admin',
        );
      }
    }

    const nextName = dto.name?.trim();
    const nextPermissions =
      dto.permissions !== undefined
        ? sanitizeAdminPermissions(dto.permissions)
        : undefined;

    await this.prisma.$transaction(async (tx) => {
      if (nextName) {
        await tx.user.update({
          where: { id: user.id },
          data: { name: nextName },
        });
      }

      const profileData: {
        permissions?: string[];
        active?: boolean;
        invitedById?: string;
      } = {};

      if (nextPermissions) {
        profileData.permissions = nextPermissions;
      }
      if (dto.active !== undefined) {
        profileData.active = dto.active;
      }
      if (!user.adminProfile) {
        profileData.invitedById = actor.id;
        if (!profileData.permissions) {
          profileData.permissions = sanitizeAdminPermissions(
            ADMIN_PERMISSION_CATALOG.map((p) => p.key),
          );
        }
      }

      if (Object.keys(profileData).length > 0 || !user.adminProfile) {
        await tx.adminProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            permissions:
              profileData.permissions ??
              sanitizeAdminPermissions(
                ADMIN_PERMISSION_CATALOG.map((p) => p.key),
              ),
            active: profileData.active ?? true,
            invitedById: actor.id,
          },
          update: {
            ...(profileData.permissions
              ? { permissions: profileData.permissions }
              : {}),
            ...(profileData.active !== undefined
              ? { active: profileData.active }
              : {}),
          },
        });
      }
    });

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        adminProfile: {
          include: {
            invitedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const action =
      dto.active === false
        ? AuditAction.ADMIN_TEAM_DEACTIVATE
        : dto.active === true
          ? AuditAction.ADMIN_TEAM_REACTIVATE
          : AuditAction.ADMIN_TEAM_UPDATE;

    await this.audit.log({
      userId: actor.id,
      action,
      entity: 'admin_profile',
      entityId: updated.adminProfile?.id ?? updated.id,
      metadata: {
        email: updated.email,
        permissions: updated.adminProfile?.permissions,
        active: updated.adminProfile?.active,
      },
    });

    return { updated: true, admin: this.serializeAdmin(updated) };
  }

  async resendInvite(actor: RequestUser, adminUserId: string) {
    this.assertMainAdmin(actor);

    const user = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      include: { adminProfile: true },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }
    if (isMainAdminEmail(user.email, this.mainAdminEmail())) {
      throw new BadRequestException('Cannot resend invite for the main admin');
    }
    if (user.adminProfile && !user.adminProfile.active) {
      throw new BadRequestException('Reactivate the admin before resending');
    }

    const rawToken = randomBytes(32).toString('hex');
    const passwordResetToken = createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const passwordResetExpires = new Date(Date.now() + SETUP_TOKEN_TTL_MS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken, passwordResetExpires },
    });

    const setupUrl = `${this.appUrl()}/reset-password?token=${rawToken}`;
    void this.mail
      .sendAdminInviteEmail(user.email, user.name, setupUrl)
      .catch(() => undefined);

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.ADMIN_TEAM_RESEND_INVITE,
      entity: 'admin_profile',
      entityId: user.adminProfile?.id ?? user.id,
      metadata: { email: user.email },
    });

    return { sent: true };
  }
}
