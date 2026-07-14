export type InstExaminerNavIcon =
  | "layout-dashboard"
  | "mic"
  | "pen-line"
  | "user";

export type InstExaminerNavBadgeKey = "speaking" | "writing";

export type InstExaminerNavItem = {
  label: string;
  href: string;
  icon: InstExaminerNavIcon;
  badgeKey?: InstExaminerNavBadgeKey;
};

export const INST_EXAMINER_BASE = "/inst-examiner";

export const instExaminerNav: InstExaminerNavItem[] = [
  { label: "Dashboard", href: "/inst-examiner", icon: "layout-dashboard" },
  {
    label: "Speaking Sessions",
    href: "/inst-examiner/speaking",
    icon: "mic",
    badgeKey: "speaking",
  },
  {
    label: "Writing Grading",
    href: "/inst-examiner/grading",
    icon: "pen-line",
    badgeKey: "writing",
  },
  { label: "Profile", href: "/inst-examiner/profile", icon: "user" },
];

export function isInstExaminerNavActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/inst-examiner") {
    return pathname === "/inst-examiner";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
