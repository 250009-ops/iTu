import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../../common/mail/mail.service';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DisableTotpDto, EnableTotpDto } from './dto/totp.dto';
import { TotpService } from './totp.service';

const DASHBOARD_PATHS: Record<UserRole, string> = {
  STUDENT: '/student',
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
    private audit: AuditService,
    private totp: TotpService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      await this.audit.log({
        action: AuditAction.AUTH_LOGIN_FAILURE,
        entity: 'user',
        metadata: { email },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.audit.log({
        userId: user.id,
        action: AuditAction.AUTH_LOGIN_FAILURE,
        entity: 'user',
        entityId: user.id,
        metadata: { email },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.totpEnabled) {
      if (!dto.totpCode?.trim()) {
        return {
          requiresTwoFactor: true,
          user: { email: user.email, name: user.name },
        };
      }

      const totpValid = user.totpSecret
        ? await this.totp.verifyCode(user.totpSecret, dto.totpCode.trim())
        : false;

      if (!totpValid) {
        await this.audit.log({
          userId: user.id,
          action: AuditAction.AUTH_LOGIN_FAILURE,
          entity: 'user',
          entityId: user.id,
          metadata: { email, reason: 'invalid_totp' },
        });
        throw new UnauthorizedException('Invalid authentication code');
      }
    }

    await this.audit.log({
      userId: user.id,
      action: AuditAction.AUTH_LOGIN_SUCCESS,
      entity: 'user',
      entityId: user.id,
    });

    return this.buildAuthResponse(user);
  }

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('You must accept the terms to continue');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const examType =
      dto.examType === 'GENERAL_TRAINING' || dto.examType === 'general_training'
        ? 'GENERAL_TRAINING'
        : 'ACADEMIC';

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.fullName.trim(),
        passwordHash,
        role: UserRole.STUDENT,
        studentProfile: {
          create: {
            targetBand: dto.targetBand,
            examType: examType as 'ACADEMIC' | 'GENERAL_TRAINING',
          },
        },
      },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.AUTH_REGISTER,
      entity: 'user',
      entityId: user.id,
      metadata: { email, examType },
    });

    void this.mail.sendWelcomeEmail(user.email, user.name).catch(() => undefined);

    return this.buildAuthResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.toUserResponse(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.audit.log({
      userId,
      action: AuditAction.AUTH_PASSWORD_CHANGE,
      entity: 'user',
      entityId: userId,
    });

    return { updated: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const passwordResetToken = createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken, passwordResetExpires },
      });

      const appUrl = this.config
        .get<string>('APP_URL', 'http://localhost:3000')
        .replace(/\/$/, '');
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      await this.mail.sendPasswordResetEmail(user.email, user.name, resetUrl);
    }

    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const passwordResetToken = createHash('sha256')
      .update(dto.token.trim())
      .digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'This reset link is invalid or has expired. Request a new one.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.AUTH_PASSWORD_RESET,
      entity: 'user',
      entityId: user.id,
    });

    return { updated: true };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = this.totp.createSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpPendingSecret: secret },
    });

    const otpauthUrl = this.totp.buildOtpauthUrl(secret, user.email);
    const qrDataUrl = await this.totp.toQrDataUrl(otpauthUrl);

    return { secret, otpauthUrl, qrDataUrl };
  }

  async enableTwoFactor(userId: string, dto: EnableTotpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpPendingSecret) {
      throw new BadRequestException('Start two-factor setup first');
    }

    const valid = await this.totp.verifyCode(
      user.totpPendingSecret,
      dto.code.trim(),
    );
    if (!valid) {
      throw new BadRequestException('Invalid authentication code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: user.totpPendingSecret,
        totpPendingSecret: null,
        totpEnabled: true,
      },
    });

    await this.audit.log({
      userId,
      action: AuditAction.AUTH_2FA_ENABLE,
      entity: 'user',
      entityId: userId,
    });

    return { enabled: true };
  }

  async disableTwoFactor(userId: string, dto: DisableTotpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    const totpValid = await this.totp.verifyCode(user.totpSecret, dto.code.trim());
    if (!totpValid) {
      throw new BadRequestException('Invalid authentication code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpPendingSecret: null,
        totpEnabled: false,
      },
    });

    await this.audit.log({
      userId,
      action: AuditAction.AUTH_2FA_DISABLE,
      entity: 'user',
      entityId: userId,
    });

    return { disabled: true };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    studentProfile: { id: string } | null;
    teacherProfile: { id: string } | null;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      user: this.toUserResponse(user),
      dashboardPath: DASHBOARD_PATHS[user.role],
    };
  }

  private toUserResponse(
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      totpEnabled?: boolean;
      studentProfile?: {
        id: string;
        targetBand?: number | null;
        examType?: string;
        country?: string | null;
      } | null;
      teacherProfile?: {
        id: string;
        status?: string;
        speciality?: string;
        rating?: number | null;
      } | null;
    },
  ) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.toLowerCase(),
      totpEnabled: user.totpEnabled ?? false,
      studentProfile: user.studentProfile
        ? {
            id: user.studentProfile.id,
            targetBand: user.studentProfile.targetBand ?? null,
            examType: user.studentProfile.examType
              ?.toLowerCase()
              .replace('_', '_'),
            country: user.studentProfile.country ?? null,
          }
        : undefined,
      teacherProfile: user.teacherProfile
        ? {
            id: user.teacherProfile.id,
            status: user.teacherProfile.status?.toLowerCase(),
            speciality: user.teacherProfile.speciality?.toLowerCase(),
            rating: user.teacherProfile.rating ?? null,
          }
        : undefined,
    };
  }
}
