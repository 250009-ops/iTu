import { ForbiddenException } from '@nestjs/common';
import { RequestUser } from '../types/request-user';

/**
 * Tenant-scoping guard helper. Every institution portal service call MUST resolve
 * the caller's institutionId through this so a center can only ever read/write its
 * own data. Throws if the user is not linked to an institution.
 */
export function requireInstitutionId(user: RequestUser): string {
  if (!user?.institutionId) {
    throw new ForbiddenException('No institution is linked to this account.');
  }
  return user.institutionId;
}

/**
 * Asserts a resource belongs to the caller's institution. Use after loading a row
 * that carries an institutionId to prevent cross-tenant access.
 */
export function assertSameInstitution(
  user: RequestUser,
  resourceInstitutionId: string | null | undefined,
): void {
  const institutionId = requireInstitutionId(user);
  if (resourceInstitutionId !== institutionId) {
    throw new ForbiddenException('Access denied for this institution resource.');
  }
}
