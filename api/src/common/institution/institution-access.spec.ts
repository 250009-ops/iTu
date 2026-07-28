import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InstitutionStatus } from '@prisma/client';
import {
  assertInstitutionCanLogin,
  assertInstitutionOperational,
  isInstitutionOperational,
} from './institution-access';

describe('institution-access', () => {
  it('treats only ACTIVE as operational', () => {
    expect(isInstitutionOperational(InstitutionStatus.ACTIVE)).toBe(true);
    expect(isInstitutionOperational(InstitutionStatus.SUSPENDED)).toBe(false);
    expect(isInstitutionOperational(InstitutionStatus.PENDING)).toBe(false);
    expect(isInstitutionOperational(InstitutionStatus.REJECTED)).toBe(false);
  });

  it('blocks login for suspended centres', () => {
    expect(() =>
      assertInstitutionCanLogin({ status: InstitutionStatus.SUSPENDED }),
    ).toThrow(UnauthorizedException);
  });

  it('blocks login for pending and rejected centres', () => {
    expect(() =>
      assertInstitutionCanLogin({ status: InstitutionStatus.PENDING }),
    ).toThrow(UnauthorizedException);
    expect(() =>
      assertInstitutionCanLogin({ status: InstitutionStatus.REJECTED }),
    ).toThrow(UnauthorizedException);
  });

  it('allows login for active centres', () => {
    expect(() =>
      assertInstitutionCanLogin({ status: InstitutionStatus.ACTIVE }),
    ).not.toThrow();
  });

  it('forbids ops for suspended centres', () => {
    expect(() =>
      assertInstitutionOperational({ status: InstitutionStatus.SUSPENDED }),
    ).toThrow(ForbiddenException);
  });
});
