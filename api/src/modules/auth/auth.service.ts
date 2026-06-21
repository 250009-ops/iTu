import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, TeacherSpeciality } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { extname } from 'path';
import { MailService } from '../../common/mail/mail.service';
import { StorageService } from '../../common/storage/storage.service';
import { AuditAction } from '../../common/audit/audit.actions';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterTeacherDto } from './dto/register-teacher.dto';
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

const CERT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const CERT_EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
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
    private storage: StorageService,
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

    this.assertTeacherCanLogin(user);

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

  async registerTeacher(
    dto: RegisterTeacherDto,
    certificateFiles: Express.Multer.File[],
  ) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('You must accept the terms to continue');
    }

    if (!certificateFiles?.length) {
      throw new BadRequestException('Upload at least one qualification certificate');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const certificateUrls = await this.saveTeacherCertificates(
      email,
      certificateFiles,
    );

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const speciality =
      dto.speciality === 'writing'
        ? TeacherSpeciality.WRITING
        : dto.speciality === 'speaking'
          ? TeacherSpeciality.SPEAKING
          : TeacherSpeciality.BOTH;

    const slug = await this.generateUniqueTeacherSlug(dto.fullName.trim());
    const applicationData = {
      ieltsWritingBand: dto.ieltsWritingBand,
      ieltsSpeakingBand: dto.ieltsSpeakingBand,
      yearsExperience: dto.yearsExperience,
      qualifications: dto.qualifications,
      certificateUrls,
      phone: dto.phone?.trim() || null,
      submittedAt: new Date().toISOString(),
    };

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.fullName.trim(),
        passwordHash,
        role: UserRole.TEACHER,
        teacherProfile: {
          create: {
            slug,
            bio: dto.bio.trim(),
            languages: dto.languages,
            credentials: dto.qualifications,
            speciality,
            status: 'PENDING',
            applicationData,
          },
        },
      },
      include: { teacherProfile: true },
    });

    await this.audit.log({
      userId: user.id,
      action: AuditAction.AUTH_TEACHER_REGISTER,
      entity: 'teacher_profile',
      entityId: user.teacherProfile!.id,
      metadata: {
        email,
        speciality: dto.speciality,
        ieltsWritingBand: dto.ieltsWritingBand,
        ieltsSpeakingBand: dto.ieltsSpeakingBand,
      },
    });

    void this.mail
      .sendTeacherApplicationReceived(user.email, user.name)
      .catch(() => undefined);

    return {
      submitted: true,
      message:
        'Your examiner application has been submitted. We will email you when it is reviewed.',
      email: user.email,
    };
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

  private assertTeacherCanLogin(user: {
    role: UserRole;
    teacherProfile?: { status: string } | null;
  }) {
    if (user.role !== UserRole.TEACHER || !user.teacherProfile) {
      return;
    }

    if (user.teacherProfile.status === 'PENDING') {
      throw new UnauthorizedException(
        'Your examiner application is under review. We will email you when it is approved.',
      );
    }

    if (user.teacherProfile.status === 'SUSPENDED') {
      throw new UnauthorizedException(
        'Your examiner account has been suspended. Contact support@itestu.uz for help.',
      );
    }
  }

  private async saveTeacherCertificates(
    email: string,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const urls: string[] = [];
    const safeEmail = email.replace(/[^a-z0-9]/g, '-');

    for (const [index, file] of files.entries()) {
      if (!CERT_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(
          'Certificates must be PDF or image files (JPG, PNG, WebP)',
        );
      }

      const ext =
        CERT_EXT_BY_MIME[file.mimetype] ??
        (extname(file.originalname) || '.bin');
      const relativePath = `teacher-applications/${safeEmail}/${Date.now()}-${index}${ext}`;
      const url = await this.storage.saveBuffer(relativePath, file.buffer);
      urls.push(url);
    }

    return urls;
  }

  private async generateUniqueTeacherSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);

    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = randomBytes(2).toString('hex');
      const slug = `${base || 'examiner'}-${suffix}`;
      const exists = await this.prisma.teacherProfile.findUnique({
        where: { slug },
      });
      if (!exists) return slug;
    }

    return `examiner-${randomBytes(4).toString('hex')}`;
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
