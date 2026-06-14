import { UserRole } from '@prisma/client';

export class RequestUser {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  studentProfileId?: string;
  teacherProfileId?: string;
}
