import type { AdminPermission } from "@/lib/admin/permissions";

export type AdminNavIcon =
  | "layout-dashboard"
  | "book-open"
  | "package"
  | "user-check"
  | "radio"
  | "users"
  | "graduation-cap"
  | "receipt"
  | "alert-triangle"
  | "bar-chart"
  | "building"
  | "settings"
  | "bell"
  | "help-circle"
  | "shield"
  | "key-round";

export type AdminNavBadgeKey = "liveSessions" | "openTickets";

export type AdminNavChildItem = {
  label: string;
  href: string;
  permission: AdminPermission;
};

export type AdminNavItem = {
  label: string;
  href?: string;
  icon: AdminNavIcon;
  badgeKey?: AdminNavBadgeKey;
  /** Required when the item has a direct href (no children). */
  permission?: AdminPermission;
  children?: AdminNavChildItem[];
};

export type AdminNavGroup = {
  label?: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: "layout-dashboard",
        permission: "dashboard",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Content Studio",
        icon: "book-open",
        children: [
          {
            label: "Mock Creation",
            href: "/admin/content",
            permission: "content",
          },
          {
            label: "Practice Creation",
            href: "/admin/content/practice",
            permission: "practice",
          },
        ],
      },
      {
        label: "Packages & Pricing",
        icon: "package",
        children: [
          {
            label: "Mock Packages",
            href: "/admin/packages",
            permission: "packages",
          },
          {
            label: "Practice & AI Packages",
            href: "/admin/packages/practice",
            permission: "packages",
          },
          {
            label: "Institution Mock Sets",
            href: "/admin/packages/institution-sets",
            permission: "institution-sets",
          },
        ],
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Teachers",
        href: "/admin/teachers",
        icon: "user-check",
        permission: "teachers",
      },
      {
        label: "Students",
        href: "/admin/students",
        icon: "graduation-cap",
        permission: "students",
      },
      {
        label: "Institutions",
        href: "/admin/institutions",
        icon: "building",
        permission: "institutions",
      },
      {
        label: "Live Monitor",
        href: "/admin/sessions",
        icon: "radio",
        badgeKey: "liveSessions",
        permission: "sessions",
      },
      {
        label: "Enrollments",
        href: "/admin/enrollments",
        icon: "users",
        permission: "enrollments",
      },
      {
        label: "Orders",
        href: "/admin/orders",
        icon: "receipt",
        permission: "orders",
      },
      {
        label: "Disputes",
        href: "/admin/disputes",
        icon: "alert-triangle",
        badgeKey: "openTickets",
        permission: "disputes",
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        label: "Reports",
        href: "/admin/reports",
        icon: "bar-chart",
        permission: "reports",
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: "settings",
        permission: "settings",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Account Security",
        href: "/admin/account",
        icon: "key-round",
        // No permission — every admin can change their own password.
      },
      {
        label: "Notifications",
        href: "/admin/notifications",
        icon: "bell",
        permission: "notifications",
      },
      {
        label: "Help",
        href: "/admin/help",
        icon: "help-circle",
        permission: "help",
      },
      {
        label: "Team",
        href: "/admin/admins",
        icon: "shield",
        permission: "admins",
      },
    ],
  },
];

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin/content") {
    return pathname === href;
  }
  if (href === "/admin/packages") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminNavParentActive(
  pathname: string,
  item: AdminNavItem,
): boolean {
  if (item.href) {
    return isAdminNavItemActive(pathname, item.href);
  }
  return item.children?.some((child) => isAdminNavItemActive(pathname, child.href)) ?? false;
}

export const adminNav: AdminNavItem[] = adminNavGroups.flatMap((group) =>
  group.items.flatMap((item) => {
    if (item.children?.length) {
      return item.children.map((child) => ({
        label: child.label,
        href: child.href,
        icon: item.icon,
        permission: child.permission,
      }));
    }
    return [item];
  }),
);
