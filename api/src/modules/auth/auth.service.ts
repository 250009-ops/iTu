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
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

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

    return { updated: true };
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
