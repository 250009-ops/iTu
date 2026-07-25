"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAdminPermissions } from "@/contexts/admin-permissions-context";
import { permissionForAdminPath } from "@/lib/admin/permissions";

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, can, homePath, isMainAdmin } = useAdminPermissions();

  useEffect(() => {
    if (loading) return;
    const required = permissionForAdminPath(pathname);
    if (!required) return;
    if (required === "admins" && !isMainAdmin) {
      router.replace(homePath);
      return;
    }
    if (!can(required)) {
      router.replace(homePath);
    }
  }, [can, homePath, isMainAdmin, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  const required = permissionForAdminPath(pathname);
  if (required === "admins" && !isMainAdmin) return null;
  if (required && !can(required)) return null;

  return <>{children}</>;
}
