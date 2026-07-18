import {
  STUDENT_VIEW_PATHS,
  type StudentView,
} from "@/lib/student/routes";

export type NavItem = {
  label: string;
  href: string;
  icon: "layout-dashboard" | "search" | "calendar-days" | "trophy" | "user";
  badge?: number;
};

export const studentNav: NavItem[] = [
  {
    label: "Dashboard",
    href: STUDENT_VIEW_PATHS.dashboard,
    icon: "layout-dashboard",
  },
  {
    label: "Browse Mocks",
    href: STUDENT_VIEW_PATHS.browse,
    icon: "search",
  },
  {
    label: "Mock Day Hub",
    href: STUDENT_VIEW_PATHS["mock-day"],
    icon: "calendar-days",
  },
  {
    label: "Practice",
    href: "/student/practice",
    icon: "search",
  },
  {
    label: "Results",
    href: STUDENT_VIEW_PATHS.results,
    icon: "trophy",
  },
  {
    label: "Profile",
    href: STUDENT_VIEW_PATHS.profile,
    icon: "user",
  },
];

export function navItemToView(href: string): StudentView | null {
  const entry = Object.entries(STUDENT_VIEW_PATHS).find(([, path]) => path === href);
  return entry ? (entry[0] as StudentView) : null;
}
