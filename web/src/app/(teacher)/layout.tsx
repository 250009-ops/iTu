import { AuthGuard } from "@/components/auth/auth-guard";
import { InstitutionExaminerRedirect } from "@/components/teacher/institution-examiner-redirect";
import { TeacherShell } from "@/components/teacher/teacher-shell";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["teacher"]}>
      <InstitutionExaminerRedirect />
      <TeacherShell>{children}</TeacherShell>
    </AuthGuard>
  );
}
