/** Stable admin sidebar / capability keys. */
export const ADMIN_PERMISSIONS = [
  'dashboard',
  'content',
  'practice',
  'packages',
  'institution-sets',
  'teachers',
  'students',
  'orders',
  'enrollments',
  'institutions',
  'sessions',
  'reports',
  'disputes',
  'notifications',
  'settings',
  'help',
  'admins',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const DEFAULT_MAIN_ADMIN_EMAIL = 'serkinov393@gmail.com';

/** Permissions that can be assigned to invited admins (excludes team management). */
export const ASSIGNABLE_ADMIN_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSIONS.filter(
  (p) => p !== 'admins',
);

const PERMISSION_SET = new Set<string>(ADMIN_PERMISSIONS);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getMainAdminEmail(configured?: string | null): string {
  const value = configured?.trim();
  return value ? value.toLowerCase() : DEFAULT_MAIN_ADMIN_EMAIL;
}

export function isMainAdminEmail(
  email: string | null | undefined,
  configuredMainAdminEmail?: string | null,
): boolean {
  if (!email) return false;
  return normalizeEmail(email) === getMainAdminEmail(configuredMainAdminEmail);
}

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === 'string' && PERMISSION_SET.has(value);
}

export function sanitizeAdminPermissions(input: unknown): AdminPermission[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<AdminPermission>();
  for (const item of input) {
    if (isAdminPermission(item) && item !== 'admins') {
      unique.add(item);
    }
  }
  return ADMIN_PERMISSIONS.filter((p) => unique.has(p));
}

export function parseStoredAdminPermissions(
  raw: unknown,
): AdminPermission[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const unique = new Set<AdminPermission>();
  for (const item of raw) {
    if (isAdminPermission(item)) unique.add(item);
  }
  return ADMIN_PERMISSIONS.filter((p) => unique.has(p));
}

/**
 * Resolve effective permissions for an ADMIN user.
 * - Main admin → full access (null)
 * - No profile / null permissions → full access (legacy)
 * - Inactive profile → empty (no access)
 * - Explicit array → those keys only
 */
export function resolveAdminPermissions(opts: {
  email: string;
  mainAdminEmail?: string | null;
  profile?: {
    active: boolean;
    permissions: unknown;
  } | null;
}): AdminPermission[] | null {
  if (isMainAdminEmail(opts.email, opts.mainAdminEmail)) {
    return null;
  }
  if (!opts.profile) {
    return null;
  }
  if (!opts.profile.active) {
    return [];
  }
  return parseStoredAdminPermissions(opts.profile.permissions);
}

export function adminHasPermission(
  permissions: AdminPermission[] | null | undefined,
  required: AdminPermission,
  opts?: { isMainAdmin?: boolean },
): boolean {
  if (required === 'admins') {
    return Boolean(opts?.isMainAdmin);
  }
  if (opts?.isMainAdmin) return true;
  if (permissions == null) return true;
  return permissions.includes(required);
}

export function adminHasFullAccess(
  permissions: AdminPermission[] | null | undefined,
): boolean {
  return permissions == null;
}

/** Labels for invite UI / API catalog. */
export const ADMIN_PERMISSION_CATALOG: {
  key: AdminPermission;
  label: string;
  group: string;
}[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { key: 'content', label: 'Mock Creation', group: 'Content' },
  { key: 'practice', label: 'Practice Creation', group: 'Content' },
  { key: 'packages', label: 'Packages & Pricing', group: 'Content' },
  {
    key: 'institution-sets',
    label: 'Institution Mock Sets',
    group: 'Content',
  },
  { key: 'teachers', label: 'Teachers', group: 'Management' },
  { key: 'students', label: 'Students', group: 'Management' },
  { key: 'institutions', label: 'Institutions', group: 'Management' },
  { key: 'sessions', label: 'Live Monitor', group: 'Management' },
  { key: 'enrollments', label: 'Enrollments', group: 'Management' },
  { key: 'orders', label: 'Orders', group: 'Management' },
  { key: 'disputes', label: 'Disputes', group: 'Management' },
  { key: 'reports', label: 'Reports', group: 'Analytics' },
  { key: 'settings', label: 'Settings', group: 'Analytics' },
  { key: 'notifications', label: 'Notifications', group: 'Account' },
  { key: 'help', label: 'Help', group: 'Account' },
];

/**
 * Map API path (after stripping /api/v1) to a required permission.
 * Returns null when any active admin may call the route.
 */
export function resolvePermissionForAdminPath(
  path: string,
): AdminPermission | 'main-admin' | null {
  const normalized = path.split('?')[0].replace(/\/+$/, '') || '/';
  const adminIdx = normalized.indexOf('/admin');
  const adminPath =
    adminIdx >= 0 ? normalized.slice(adminIdx) : normalized;

  const rules: Array<{ prefix: string; permission: AdminPermission | 'main-admin' | null }> = [
    { prefix: '/admin/admins', permission: 'main-admin' },
    { prefix: '/admin/content', permission: 'content' },
    { prefix: '/admin/practice/packages', permission: 'packages' },
    { prefix: '/admin/practice/students', permission: 'students' },
    { prefix: '/admin/practice/units', permission: 'practice' },
    { prefix: '/admin/practice/writing-prompts', permission: 'practice' },
    { prefix: '/admin/practice', permission: 'practice' },
    { prefix: '/admin/institution-mock-sets', permission: 'institution-sets' },
    { prefix: '/admin/institutions', permission: 'institutions' },
    { prefix: '/admin/settings', permission: 'settings' },
    { prefix: '/admin/dashboard', permission: 'dashboard' },
    { prefix: '/admin/nav-badges', permission: null },
    { prefix: '/admin/enrollments', permission: 'enrollments' },
    { prefix: '/admin/students', permission: 'students' },
    { prefix: '/admin/teachers', permission: 'teachers' },
    { prefix: '/admin/orders', permission: 'orders' },
    { prefix: '/admin/payouts', permission: 'orders' },
    { prefix: '/admin/band-table', permission: 'settings' },
    { prefix: '/admin/disputes', permission: 'disputes' },
    { prefix: '/admin/packages', permission: 'packages' },
    { prefix: '/admin/reports', permission: 'reports' },
    { prefix: '/admin/sessions', permission: 'sessions' },
    { prefix: '/admin/audit-logs', permission: 'settings' },
  ];

  for (const rule of rules) {
    if (
      adminPath === rule.prefix ||
      adminPath.startsWith(`${rule.prefix}/`)
    ) {
      return rule.permission;
    }
  }

  // Unknown /admin/* routes: require full access (legacy-safe deny for restricted admins)
  if (adminPath === '/admin' || adminPath.startsWith('/admin/')) {
    return 'dashboard';
  }
  return null;
}
