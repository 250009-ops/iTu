export type StudentPortal = "marketplace" | "institution";

export function studentDashboardHref(portal: StudentPortal): string {
  return portal === "institution" ? "/inst-student" : "/student";
}

export function studentMockDayHref(portal: StudentPortal): string {
  return portal === "institution" ? "/inst-student/my-mock" : "/student/mock-day";
}

export function studentPracticeHref(portal: StudentPortal): string {
  return portal === "institution" ? "/inst-student/practice" : "/student/practice";
}
