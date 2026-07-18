import { NotFoundException } from '@nestjs/common';

/** Platform content uses institutionId null; centre content uses the tenant id. */
export type ContentScope = {
  institutionId: string | null;
};

export const PLATFORM_CONTENT_SCOPE: ContentScope = { institutionId: null };

export function packageScopeKey(institutionId: string | null): string {
  return institutionId ?? 'platform';
}

export function scopeWhere(scope: ContentScope) {
  return { institutionId: scope.institutionId };
}

export function assertScopeMatch(
  resource: { institutionId: string | null },
  scope: ContentScope,
): void {
  if (resource.institutionId !== scope.institutionId) {
    throw new NotFoundException('Test not found');
  }
}

export function assertPackageScopeMatch(
  pkg: { institutionId: string | null },
  scope: ContentScope,
): void {
  if (pkg.institutionId !== scope.institutionId) {
    throw new NotFoundException('Package not found');
  }
}
