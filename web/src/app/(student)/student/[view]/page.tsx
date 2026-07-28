import { redirect } from "next/navigation";
import {
  isStudentSpaViewSegment,
  STUDENT_VIEW_PATHS,
} from "@/lib/student/routes";

/**
 * Single-segment SPA route anchor for /student/:view (browse, results, …).
 *
 * Intentionally NOT an optional catch-all: `[[...view]]` was matching nested
 * Practice paths like /student/practice/attempt/:id and rendering null.
 * Examiner deep links live at `teachers/[slug]/page.tsx`.
 */
export default async function StudentSpaViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!isStudentSpaViewSegment(view)) {
    // SPA shell ignores page children, so notFound() would still paint
    // the dashboard via StudentViewRouter — redirect instead.
    redirect(STUDENT_VIEW_PATHS.dashboard);
  }
  return null;
}
