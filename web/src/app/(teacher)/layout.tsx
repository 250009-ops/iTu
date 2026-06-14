import { AuthGuard } from "@/components/auth/auth-guard";
import { TeacherShell } from "@/components/teacher/teacher-shell";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["teacher"]}>
      <TeacherShell>{children}</TeacherShell>
    </AuthGuard>
  );
}
