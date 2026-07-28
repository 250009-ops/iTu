import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InstitutionStatus } from '@prisma/client';

/** Centre must be ACTIVE for institution-portal login and API access. */
export function isInstitutionOperational(
  status: string | InstitutionStatus | null | undefined,
): boolean {
  return status === InstitutionStatus.ACTIVE || status === 'ACTIVE';
}

/** Login-time messages (401) — mirrors assertTeacherCanLogin tone. */
export function assertInstitutionCanLogin(institution: {
  status: string | InstitutionStatus;
} | null | undefined): void {
  if (!institution) {
    throw new UnauthorizedException(
      'Your centre account is not linked. Contact support@itestu.uz for help.',
    );
  }

  if (institution.status === InstitutionStatus.PENDING || institution.status === 'PENDING') {
    throw new UnauthorizedException(
      'Your centre application is under review. We will email you when it is approved.',
    );
  }

  if (
    institution.status === InstitutionStatus.SUSPENDED ||
    institution.status === 'SUSPENDED'
  ) {
    throw new UnauthorizedException(
      'Your centre account has been suspended. Contact support@itestu.uz for help.',
    );
  }

  if (
    institution.status === InstitutionStatus.REJECTED ||
    institution.status === 'REJECTED'
  ) {
    throw new UnauthorizedException(
      'Your centre application was not approved. Contact support@itestu.uz for help.',
    );
  }

  if (!isInstitutionOperational(institution.status)) {
    throw new UnauthorizedException(
      'Your centre account is not active. Contact support@itestu.uz for help.',
    );
  }
}

/** Request-time denial for institution module ops (403). */
export function assertInstitutionOperational(institution: {
  status: string | InstitutionStatus;
}): void {
  if (isInstitutionOperational(institution.status)) return;

  if (
    institution.status === InstitutionStatus.SUSPENDED ||
    institution.status === 'SUSPENDED'
  ) {
    throw new ForbiddenException(
      'Your centre account has been suspended. Contact support@itestu.uz for help.',
    );
  }

  throw new ForbiddenException(
    'Your centre account is not active. Contact support@itestu.uz for help.',
  );
}
