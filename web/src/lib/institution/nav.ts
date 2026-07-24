export type InstitutionNavIcon =
  | "layout-dashboard"
  | "coins"
  | "graduation-cap"
  | "user-check"
  | "calendar"
  | "bar-chart"
  | "settings"
  | "message-square"
  | "file-text"
  | "radio"
  | "package";

export type InstitutionNavItem = {
  label: string;
  href: string;
  icon: InstitutionNavIcon;
  /** Shows the pending-students count badge. */
  badge?: "pendingStudents" | "flaggedSessions";
};

export type InstitutionNavGroup = {
  label?: string;
  items: InstitutionNavItem[];
};

export const institutionNavGroups: InstitutionNavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/institution", icon: "layout-dashboard" },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Tests", href: "/institution/tests", icon: "file-text" },
      {
        label: "Buy test sets",
        href: "/institution/mocks/shop",
        icon: "coins",
      },
      { label: "Mocks", href: "/institution/mocks", icon: "package" },
      {
        label: "Students",
        href: "/institution/students",
        icon: "graduation-cap",
        badge: "pendingStudents",
      },
      { label: "Examiners", href: "/institution/examiners", icon: "user-check" },
      {
        label: "Mock Schedule",
        href: "/institution/schedule",
        icon: "calendar",
      },
      {
        label: "Live Monitor",
        href: "/institution/monitor",
        icon: "radio",
        badge: "flaggedSessions",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", href: "/institution/reports", icon: "bar-chart" },
      {
        label: "Centre requests",
        href: "/institution/requests",
        icon: "message-square",
      },
      { label: "Settings", href: "/institution/settings", icon: "settings" },
    ],
  },
];

export const institutionNav = institutionNavGroups.flatMap((g) => g.items);

/** `/institution/mocks/shop` must not also activate `/institution/mocks`. */
export function isInstitutionNavActive(pathname: string, href: string): boolean {
  if (href === "/institution") {
    return pathname === "/institution";
  }
  if (href === "/institution/mocks") {
    return (
      pathname === "/institution/mocks" ||
      (pathname.startsWith("/institution/mocks/") &&
        !pathname.startsWith("/institution/mocks/shop"))
    );
  }
  if (href === "/institution/tests") {
    return (
      pathname === "/institution/tests" ||
      pathname.startsWith("/institution/tests/") ||
      pathname === "/institution/content" ||
      pathname.startsWith("/institution/content/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
