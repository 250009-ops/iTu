export type TeacherNavIcon =
  | "layout-dashboard"
  | "calendar"
  | "mic"
  | "pen-line"
  | "wallet"
  | "user";

export type TeacherNavBadgeKey = "speaking" | "writing";

export type TeacherNavItem = {
  label: string;
  href: string;
  icon: TeacherNavIcon;
  badgeKey?: TeacherNavBadgeKey;
};

export const teacherNav: TeacherNavItem[] = [
  { label: "Dashboard", href: "/teacher/dashboard", icon: "layout-dashboard" },
  { label: "Availability", href: "/teacher/availability", icon: "calendar" },
  {
    label: "Speaking Sessions",
    href: "/teacher/speaking",
    icon: "mic",
    badgeKey: "speaking",
  },
  {
    label: "Writing Grading",
    href: "/teacher/grading",
    icon: "pen-line",
    badgeKey: "writing",
  },
  { label: "Earnings", href: "/teacher/earnings", icon: "wallet" },
  { label: "Profile", href: "/teacher/profile", icon: "user" },
];
