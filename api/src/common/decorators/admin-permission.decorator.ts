import { SetMetadata } from '@nestjs/common';
import type { AdminPermission } from '../admin-permissions/admin-permissions';

export const ADMIN_PERMISSION_KEY = 'admin_permission';

/** Require a specific admin capability (or main-admin-only). */
export const RequireAdminPermission = (
  permission: AdminPermission | 'main-admin',
) => SetMetadata(ADMIN_PERMISSION_KEY, permission);
