import {
  adminHasPermission,
  isMainAdminEmail,
  resolveAdminPermissions,
  resolvePermissionForAdminPath,
  sanitizeAdminPermissions,
} from './admin-permissions';

describe('admin permissions', () => {
  it('identifies the main admin email case-insensitively', () => {
    expect(isMainAdminEmail('Serkinov393@gmail.com')).toBe(true);
    expect(isMainAdminEmail('other@example.com')).toBe(false);
  });

  it('gives main admin and legacy admins full access', () => {
    expect(
      resolveAdminPermissions({
        email: 'serkinov393@gmail.com',
        profile: { active: true, permissions: ['teachers'] },
      }),
    ).toBeNull();

    expect(
      resolveAdminPermissions({
        email: 'legacy@example.com',
        profile: null,
      }),
    ).toBeNull();
  });

  it('returns explicit permissions for invited admins', () => {
    expect(
      resolveAdminPermissions({
        email: 'helper@example.com',
        profile: { active: true, permissions: ['teachers', 'students'] },
      }),
    ).toEqual(['teachers', 'students']);
  });

  it('maps admin API paths to permission keys', () => {
    expect(resolvePermissionForAdminPath('/api/v1/admin/teachers')).toBe(
      'teachers',
    );
    expect(
      resolvePermissionForAdminPath('/api/v1/admin/practice/packages'),
    ).toBe('packages');
    expect(resolvePermissionForAdminPath('/api/v1/admin/practice/units')).toBe(
      'practice',
    );
    expect(resolvePermissionForAdminPath('/api/v1/admin/admins')).toBe(
      'main-admin',
    );
    expect(resolvePermissionForAdminPath('/api/v1/admin/nav-badges')).toBeNull();
  });

  it('keeps admins capability main-admin-only', () => {
    expect(
      adminHasPermission(null, 'admins', { isMainAdmin: false }),
    ).toBe(false);
    expect(
      adminHasPermission(null, 'admins', { isMainAdmin: true }),
    ).toBe(true);
    expect(
      adminHasPermission(['teachers'], 'teachers', { isMainAdmin: false }),
    ).toBe(true);
  });

  it('sanitizes assignable permissions', () => {
    expect(
      sanitizeAdminPermissions(['teachers', 'admins', 'nope', 'students']),
    ).toEqual(['teachers', 'students']);
  });
});
