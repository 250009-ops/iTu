import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestUser } from '../../../common/types/request-user';
// RequestUser is a class (required for decorator metadata)

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        studentProfile: { select: { id: true } },
        teacherProfile: { select: { id: true } },
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
    return requestUser;
  }
}
