export type InstitutionNavIcon =
  | "layout-dashboard"
  | "coins"
  | "graduation-cap"
  | "user-check"
  | "calendar"
  | "bar-chart"
  | "settings";

export type InstitutionNavItem = {
  label: string;
  href: string;
  icon: InstitutionNavIcon;
  /** Shows the pending-students count badge. */
  badge?: "pendingStudents";
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
      { label: "Credits", href: "/institution/credits", icon: "coins" },
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
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", href: "/institution/reports", icon: "bar-chart" },
      { label: "Settings", href: "/institution/settings", icon: "settings" },
    ],
  },
];

export const institutionNav = institutionNavGroups.flatMap((g) => g.items);
