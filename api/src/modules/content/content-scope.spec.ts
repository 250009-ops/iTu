import { NotFoundException } from '@nestjs/common';
import {
  assertPackageScopeMatch,
  assertScopeMatch,
  packageScopeKey,
  scopeWhere,
} from './content-scope';

describe('content-scope', () => {
  it('scopeWhere uses null for platform content', () => {
    expect(scopeWhere({ institutionId: null })).toEqual({ institutionId: null });
  });

  it('packageScopeKey maps tenant id or platform', () => {
    expect(packageScopeKey(null)).toBe('platform');
    expect(packageScopeKey('inst-1')).toBe('inst-1');
  });

  it('assertScopeMatch rejects cross-tenant access', () => {
    expect(() =>
      assertScopeMatch({ institutionId: 'centre-a' }, { institutionId: 'centre-b' }),
    ).toThrow(NotFoundException);
  });

  it('assertPackageScopeMatch rejects foreign packages', () => {
    expect(() =>
      assertPackageScopeMatch(
        { institutionId: 'centre-a' },
        { institutionId: 'centre-b' },
      ),
    ).toThrow(NotFoundException);
  });
});
