"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAdminPermissions } from "@/contexts/admin-permissions-context";
import {
  ADMIN_ACCOUNT_PATH,
  permissionForAdminPath,
  type AdminPermission,
} from "@/lib/admin/permissions";

function pathIsReachable(
  path: string,
  can: (permission: AdminPermission) => boolean,
  isMainAdmin: boolean,
): boolean {
  const required = permissionForAdminPath(path);
  if (!required) return true;
  if (required === "admins") return isMainAdmin;
  return can(required);
}

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, can, homePath, isMainAdmin } = useAdminPermissions();

  useEffect(() => {
    if (loading) return;
    const required = permissionForAdminPath(pathname);
    if (!required) return;
    const denied =
      (required === "admins" && !isMainAdmin) || !can(required);
    if (!denied) return;

    // Prefer homePath when reachable; never redirect onto the same gated URL
    // (empty [] / stale /admin/help home caused an infinite loop).
    const dest =
      homePath !== pathname && pathIsReachable(homePath, can, isMainAdmin)
        ? homePath
        : ADMIN_ACCOUNT_PATH;
    router.replace(dest);
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
