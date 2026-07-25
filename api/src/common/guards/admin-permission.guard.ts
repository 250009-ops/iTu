import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import {
  adminHasPermission,
  isMainAdminEmail,
  resolvePermissionForAdminPath,
  type AdminPermission,
} from '../admin-permissions/admin-permissions';
import { ADMIN_PERMISSION_KEY } from '../decorators/admin-permission.decorator';
import { RequestUser } from '../types/request-user';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: RequestUser;
      originalUrl?: string;
      url?: string;
      path?: string;
    }>();
    const user = request.user;

    if (!user || user.role !== UserRole.ADMIN) {
      return true;
    }

    if (user.adminActive === false && !user.isMainAdmin) {
      throw new ForbiddenException('Admin account is deactivated');
    }

    const decorated = this.reflector.getAllAndOverride<
      AdminPermission | 'main-admin' | undefined
    >(ADMIN_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const path =
      request.originalUrl || request.url || request.path || '';
    const required =
      decorated ?? resolvePermissionForAdminPath(path);

    if (required == null) {
      return true;
    }

    const mainAdminEmail = this.config.get<string>('MAIN_ADMIN_EMAIL');
    const isMain =
      user.isMainAdmin ||
      isMainAdminEmail(user.email, mainAdminEmail);

    if (required === 'main-admin' || required === 'admins') {
      if (!isMain) {
        throw new ForbiddenException(
          'Only the main admin can manage team admins',
        );
      }
      return true;
    }

    if (
      !adminHasPermission(user.adminPermissions, required, {
        isMainAdmin: isMain,
      })
    ) {
      throw new ForbiddenException(
        `Missing admin permission: ${required}`,
      );
    }

    return true;
  }
}
