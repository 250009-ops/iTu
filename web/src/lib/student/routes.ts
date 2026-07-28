export const STUDENT_BASE = "/student";

export type StudentView =
  | "dashboard"
  | "browse"
  | "mock-day"
  | "results"
  | "profile"
  | "notifications"
  | "help"
  | "teachers";

export const STUDENT_VIEW_PATHS: Record<StudentView, string> = {
  dashboard: "/student",
  browse: "/student/browse",
  "mock-day": "/student/mock-day",
  results: "/student/results",
  profile: "/student/profile",
  notifications: "/student/notifications",
  help: "/student/help",
  teachers: "/student/teachers",
};

export const STUDENT_VIEW_LABELS: Record<StudentView, string> = {
  dashboard: "Dashboard",
  browse: "Browse Mocks",
  "mock-day": "Mock Day Hub",
  results: "Results",
  profile: "Profile",
  notifications: "Notifications",
  help: "Help & Support",
  teachers: "Examiners",
};

const VALID_VIEWS = new Set<string>(Object.keys(STUDENT_VIEW_PATHS));

/** True when `:view` is a known student SPA segment (including `dashboard`). */
export function isStudentSpaViewSegment(slug: string): boolean {
  return slug === "dashboard" || VALID_VIEWS.has(slug);
}

export function parseStudentView(segments: string[] | undefined): StudentView {
  if (!segments || segments.length === 0) return "dashboard";
  const slug = segments[0];
  if (isStudentSpaViewSegment(slug)) return slug as StudentView;
  return "dashboard";
}

export function isStudentViewActive(
  pathname: string,
  view: StudentView,
): boolean {
  const path = STUDENT_VIEW_PATHS[view];
  if (view === "dashboard") {
    return pathname === "/student" || pathname === "/student/dashboard";
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function pathnameToView(pathname: string): StudentView {
  if (pathname === "/student" || pathname === "/student/dashboard") {
    return "dashboard";
  }
  if (pathname.startsWith("/student/")) {
    const slug = pathname.slice("/student/".length).split("/")[0];
    return parseStudentView([slug]);
  }
  return "dashboard";
}
