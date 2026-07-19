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
  | "settings";

export type AdminNavBadgeKey = "liveSessions" | "openTickets";

export type AdminNavChildItem = {
  label: string;
  href: string;
};

export type AdminNavItem = {
  label: string;
  href?: string;
  icon: AdminNavIcon;
  badgeKey?: AdminNavBadgeKey;
  children?: AdminNavChildItem[];
};

export type AdminNavGroup = {
  label?: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "layout-dashboard" },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Content Studio",
        icon: "book-open",
        children: [
          { label: "Mock Creation", href: "/admin/content" },
          { label: "Practice Creation", href: "/admin/content/practice" },
        ],
      },
      {
        label: "Packages & Pricing",
        icon: "package",
        children: [
          { label: "Mock Packages", href: "/admin/packages" },
          { label: "Practice & AI Packages", href: "/admin/packages/practice" },
          { label: "Institution Mock Sets", href: "/admin/packages/institution-sets" },
        ],
      },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Teachers", href: "/admin/teachers", icon: "user-check" },
      { label: "Students", href: "/admin/students", icon: "graduation-cap" },
      { label: "Institutions", href: "/admin/institutions", icon: "building" },
      {
        label: "Live Monitor",
        href: "/admin/sessions",
        icon: "radio",
        badgeKey: "liveSessions",
      },
      { label: "Enrollments", href: "/admin/enrollments", icon: "users" },
      { label: "Orders", href: "/admin/orders", icon: "receipt" },
      {
        label: "Disputes",
        href: "/admin/disputes",
        icon: "alert-triangle",
        badgeKey: "openTickets",
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Reports", href: "/admin/reports", icon: "bar-chart" },
      { label: "Settings", href: "/admin/settings", icon: "settings" },
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
      }));
    }
    return [item];
  }),
);
