export type InstStudentNavIcon =
  | "layout-dashboard"
  | "monitor-play"
  | "line-chart"
  | "user";

export type InstStudentNavItem = {
  label: string;
  href: string;
  icon: InstStudentNavIcon;
  /** Show a dot when the student has an active mock ready to sit. */
  badge?: "activeMock";
};

export const INST_STUDENT_BASE = "/inst-student";

export const instStudentNav: InstStudentNavItem[] = [
  {
    label: "Dashboard",
    href: "/inst-student",
    icon: "layout-dashboard",
  },
  {
    label: "My Mock",
    href: "/inst-student/my-mock",
    icon: "monitor-play",
    badge: "activeMock",
  },
  {
    label: "Results",
    href: "/inst-student/results",
    icon: "line-chart",
  },
  {
    label: "Profile",
    href: "/inst-student/profile",
    icon: "user",
  },
];

export function isInstStudentNavActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/inst-student") {
    return pathname === "/inst-student";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
