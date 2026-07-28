import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  isMainAdminEmail,
  resolveAdminPermissions,
} from '../../../common/admin-permissions/admin-permissions';
import { assertInstitutionCanLogin } from '../../../common/institution/institution-access';
import { RequestUser } from '../../../common/types/request-user';
import { PrismaService } from '../../../prisma/prisma.service';
// RequestUser is a class (required for decorator metadata)

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly mainAdminEmail: string;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: { query?: { access_token?: string | string[] } }) => {
          const token = req.query?.access_token;
          if (typeof token === 'string' && token.trim()) return token;
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
    this.mainAdminEmail = config.get<string>('MAIN_ADMIN_EMAIL') ?? '';
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        studentProfile: { select: { id: true } },
        teacherProfile: { select: { id: true } },
        institution: { select: { status: true } },
        adminProfile: {
          select: { active: true, permissions: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const requestUser = new RequestUser();
    requestUser.id = user.id;
    requestUser.email = user.email;
    requestUser.name = user.name;
    requestUser.role = user.role;
    requestUser.studentProfileId = user.studentProfile?.id;
    requestUser.teacherProfileId = user.teacherProfile?.id;
    requestUser.institutionId = user.institutionId ?? undefined;

    if (user.role === UserRole.INSTITUTION) {
      // Re-check on every request so mid-session suspend takes effect immediately.
      assertInstitutionCanLogin(user.institution);
    }

    if (user.role === UserRole.ADMIN) {
      const isMain = isMainAdminEmail(user.email, this.mainAdminEmail);
      requestUser.isMainAdmin = isMain;
      requestUser.adminActive = user.adminProfile?.active ?? true;
      requestUser.adminPermissions = resolveAdminPermissions({
        email: user.email,
        mainAdminEmail: this.mainAdminEmail,
        profile: user.adminProfile,
      });

      if (!isMain && user.adminProfile && !user.adminProfile.active) {
        throw new UnauthorizedException('Admin account is deactivated');
      }
    }

    return requestUser;
  }
}
