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

export type InstitutionNavChildItem = {
  label: string;
  href: string;
};

export type InstitutionNavItem = {
  label: string;
  href?: string;
  icon: InstitutionNavIcon;
  /** Shows the pending-students count badge. */
  badge?: "pendingStudents" | "flaggedSessions";
  children?: InstitutionNavChildItem[];
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
      {
        label: "Tests",
        icon: "file-text",
        children: [
          {
            label: "Purchased set",
            href: "/institution/tests/purchased",
          },
          {
            label: "Content Studio",
            href: "/institution/tests/studio",
          },
        ],
      },
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

/** Flat list for mobile nav (expands Tests children). */
export const institutionNav: Array<
  InstitutionNavItem & { href: string }
> = institutionNavGroups.flatMap((g) =>
  g.items.flatMap((item) => {
    if (item.children?.length) {
      return item.children.map((child) => ({
        label: child.label,
        href: child.href,
        icon: item.icon,
      }));
    }
    return [{ ...item, href: item.href! }];
  }),
);

export function isInstitutionNavItemActive(
  pathname: string,
  href: string,
): boolean {
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
  if (href === "/institution/tests/purchased") {
    return (
      pathname === "/institution/tests/purchased" ||
      pathname === "/institution/tests" ||
      pathname.startsWith("/institution/tests?")
    );
  }
  if (href === "/institution/tests/studio") {
    return (
      pathname === "/institution/tests/studio" ||
      pathname === "/institution/content" ||
      pathname.startsWith("/institution/content/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isInstitutionNavParentActive(
  pathname: string,
  item: InstitutionNavItem,
): boolean {
  if (item.href) {
    return isInstitutionNavItemActive(pathname, item.href);
  }
  return (
    item.children?.some((child) =>
      isInstitutionNavItemActive(pathname, child.href),
    ) ?? false
  );
}

/** @deprecated Prefer isInstitutionNavItemActive */
export function isInstitutionNavActive(pathname: string, href: string): boolean {
  return isInstitutionNavItemActive(pathname, href);
}
