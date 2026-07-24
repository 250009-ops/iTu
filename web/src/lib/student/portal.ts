import { PRACTICE_STUDENT_VISIBLE } from "@/lib/practice/feature-flags";

export type StudentPortal = "marketplace" | "institution";

export function studentDashboardHref(portal: StudentPortal): string {
  return portal === "institution" ? "/inst-student" : "/student";
}

export function studentMockDayHref(portal: StudentPortal): string {
  return portal === "institution" ? "/inst-student/my-mock" : "/student/mock-day";
}

export function studentPracticeHref(portal: StudentPortal): string {
  if (!PRACTICE_STUDENT_VISIBLE) {
    return studentDashboardHref(portal);
  }
  return portal === "institution" ? "/inst-student/practice" : "/student/practice";
}
