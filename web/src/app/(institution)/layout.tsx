import { AuthGuard } from "@/components/auth/auth-guard";
import { InstitutionShell } from "@/components/institution/institution-shell";

export default function InstitutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["institution"]}>
      <InstitutionShell>{children}</InstitutionShell>
    </AuthGuard>
  );
}
