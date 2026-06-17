export type AdminNavIcon =
  | "layout-dashboard"
  | "book-open"
  | "package"
  | "user-check"
  | "radio"
  | "users"
  | "receipt"
  | "alert-triangle"
  | "bar-chart"
  | "settings";

export type AdminNavBadgeKey = "liveSessions" | "openTickets";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: AdminNavIcon;
  badgeKey?: AdminNavBadgeKey;
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
      { label: "Content Studio", href: "/admin/content", icon: "book-open" },
      { label: "Packages & Pricing", href: "/admin/packages", icon: "package" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Teachers", href: "/admin/teachers", icon: "user-check" },
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

export const adminNav = adminNavGroups.flatMap((g) => g.items);
