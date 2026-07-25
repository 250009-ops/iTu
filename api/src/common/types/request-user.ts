import { UserRole } from '@prisma/client';
import type { AdminPermission } from '../admin-permissions/admin-permissions';

export class RequestUser {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  studentProfileId?: string;
  teacherProfileId?: string;
  institutionId?: string;
  /** null = full access; array = explicit capabilities */
  adminPermissions?: AdminPermission[] | null;
  isMainAdmin?: boolean;
  adminActive?: boolean;
}
