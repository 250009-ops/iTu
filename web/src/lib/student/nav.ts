import { PRACTICE_STUDENT_VISIBLE } from "@/lib/practice/feature-flags";
import {
  STUDENT_VIEW_PATHS,
  type StudentView,
} from "@/lib/student/routes";

export type NavItem = {
  label: string;
  href: string;
  icon:
    | "layout-dashboard"
    | "search"
    | "calendar-days"
    | "book-open"
    | "graduation-cap"
    | "trophy"
    | "user";
  badge?: number;
};

const STUDENT_NAV_ALL: NavItem[] = [
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
    label: "Examiners",
    href: STUDENT_VIEW_PATHS.teachers,
    icon: "graduation-cap",
  },
  {
    label: "Mock Day Hub",
    href: STUDENT_VIEW_PATHS["mock-day"],
    icon: "calendar-days",
  },
  {
    label: "Practice",
    href: "/student/practice",
    icon: "book-open",
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

export const studentNav: NavItem[] = PRACTICE_STUDENT_VISIBLE
  ? STUDENT_NAV_ALL
  : STUDENT_NAV_ALL.filter((item) => item.href !== "/student/practice");


export function navItemToView(href: string): StudentView | null {
  const entry = Object.entries(STUDENT_VIEW_PATHS).find(([, path]) => path === href);
  return entry ? (entry[0] as StudentView) : null;
}
