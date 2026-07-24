import { redirect } from "next/navigation";
import { PRACTICE_STUDENT_VISIBLE } from "@/lib/practice/feature-flags";

/** Redirect students away from Practice routes when the product is hidden. */
export function guardStudentPracticeAccess(dashboardPath: string): void {
  if (!PRACTICE_STUDENT_VISIBLE) {
    redirect(dashboardPath);
  }
}
