import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
