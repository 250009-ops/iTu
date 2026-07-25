export const ADMIN_PERMISSIONS = [
  "dashboard",
  "content",
  "practice",
  "packages",
  "institution-sets",
  "teachers",
  "students",
  "orders",
  "enrollments",
  "institutions",
  "sessions",
  "reports",
  "disputes",
  "notifications",
  "settings",
  "help",
  "admins",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard: "Dashboard",
  content: "Mock Creation",
  practice: "Practice Creation",
  packages: "Packages & Pricing",
  "institution-sets": "Institution Mock Sets",
  teachers: "Teachers",
  students: "Students",
  orders: "Orders",
  enrollments: "Enrollments",
  institutions: "Institutions",
  sessions: "Live Monitor",
  reports: "Reports",
  disputes: "Disputes",
  notifications: "Notifications",
  settings: "Settings",
  help: "Help",
  admins: "Team / Admins",
};

export const ADMIN_PERMISSION_GROUPS: {
  label: string;
  keys: AdminPermission[];
}[] = [
  { label: "Overview", keys: ["dashboard"] },
  {
    label: "Content",
    keys: ["content", "practice", "packages", "institution-sets"],
  },
  {
    label: "Management",
    keys: [
      "teachers",
      "students",
      "institutions",
      "sessions",
      "enrollments",
      "orders",
      "disputes",
    ],
  },
  { label: "Analytics", keys: ["reports", "settings"] },
  { label: "Account", keys: ["notifications", "help"] },
];

/** Assignable to invited admins (main-admin-only capability excluded). */
export const ASSIGNABLE_ADMIN_PERMISSIONS: AdminPermission[] =
  ADMIN_PERMISSIONS.filter((p) => p !== "admins");

const ROUTE_PERMISSIONS: Array<{
  prefix: string;
  permission: AdminPermission;
}> = [
  { prefix: "/admin/admins", permission: "admins" },
  { prefix: "/admin/content/practice", permission: "practice" },
  { prefix: "/admin/content", permission: "content" },
  { prefix: "/admin/packages/institution-sets", permission: "institution-sets" },
  { prefix: "/admin/packages/practice", permission: "packages" },
  { prefix: "/admin/packages", permission: "packages" },
  { prefix: "/admin/teachers", permission: "teachers" },
  { prefix: "/admin/students", permission: "students" },
  { prefix: "/admin/institutions", permission: "institutions" },
  { prefix: "/admin/sessions", permission: "sessions" },
  { prefix: "/admin/enrollments", permission: "enrollments" },
  { prefix: "/admin/orders", permission: "orders" },
  { prefix: "/admin/disputes", permission: "disputes" },
  { prefix: "/admin/reports", permission: "reports" },
  { prefix: "/admin/settings", permission: "settings" },
  { prefix: "/admin/notifications", permission: "notifications" },
  { prefix: "/admin/help", permission: "help" },
  { prefix: "/admin/dashboard", permission: "dashboard" },
];

export function adminHasFullAccess(
  permissions: AdminPermission[] | null | undefined,
): boolean {
  return permissions == null;
}

export function adminHasPermission(
  permissions: AdminPermission[] | null | undefined,
  required: AdminPermission,
  opts?: { isMainAdmin?: boolean },
): boolean {
  // Team management is always main-admin-only, even for legacy full-access admins.
  if (required === "admins") {
    return Boolean(opts?.isMainAdmin);
  }
  if (opts?.isMainAdmin) return true;
  if (permissions == null) return true;
  return permissions.includes(required);
}

export function permissionForAdminPath(
  pathname: string,
): AdminPermission | null {
  const path = pathname.split("?")[0] || "";
  // Self-service account security — any logged-in admin may change their own password.
  if (path === "/admin/account" || path.startsWith("/admin/account/")) {
    return null;
  }
  for (const rule of ROUTE_PERMISSIONS) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      return rule.permission;
    }
  }
  if (path === "/admin" || path.startsWith("/admin/")) {
    return "dashboard";
  }
  return null;
}

export function firstAllowedAdminPath(
  permissions: AdminPermission[] | null | undefined,
  isMainAdmin?: boolean,
): string {
  if (isMainAdmin || adminHasFullAccess(permissions)) {
    return "/admin/dashboard";
  }
  for (const rule of ROUTE_PERMISSIONS) {
    // Prefer primary destinations over nested package/content routes
    if (
      rule.prefix === "/admin/content/practice" ||
      rule.prefix === "/admin/packages/practice" ||
      rule.prefix === "/admin/packages/institution-sets"
    ) {
      continue;
    }
    if (permissions?.includes(rule.permission)) {
      return rule.prefix;
    }
  }
  if (permissions?.includes("practice")) return "/admin/content/practice";
  if (permissions?.includes("institution-sets")) {
    return "/admin/packages/institution-sets";
  }
  return "/admin/help";
}
