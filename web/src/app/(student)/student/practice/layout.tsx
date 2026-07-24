import type { ReactNode } from "react";
import { guardStudentPracticeAccess } from "@/lib/practice/guard-student-access";

export default function StudentPracticeLayout({
  children,
}: {
  children: ReactNode;
}) {
  guardStudentPracticeAccess("/student");
  return children;
}
