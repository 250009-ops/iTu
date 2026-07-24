import type { ReactNode } from "react";
import { guardStudentPracticeAccess } from "@/lib/practice/guard-student-access";

export default function InstStudentPracticeLayout({
  children,
}: {
  children: ReactNode;
}) {
  guardStudentPracticeAccess("/inst-student");
  return children;
}
