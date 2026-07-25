"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMe, type ApiUser } from "@/lib/api/auth";
import {
  adminHasPermission,
  firstAllowedAdminPath,
  type AdminPermission,
} from "@/lib/admin/permissions";

type AdminPermissionsContextValue = {
  loading: boolean;
  isMainAdmin: boolean;
  /** null = full access */
  permissions: AdminPermission[] | null;
  homePath: string;
  can: (permission: AdminPermission) => boolean;
  refresh: () => Promise<void>;
};

const AdminPermissionsContext =
  createContext<AdminPermissionsContextValue | null>(null);

function fromUser(user: ApiUser | null): Omit<
  AdminPermissionsContextValue,
  "loading" | "can" | "refresh"
> {
  const isMainAdmin = Boolean(user?.isMainAdmin);
  const permissions =
    user?.adminPermissions === undefined
      ? null
      : (user.adminPermissions as AdminPermission[] | null);
  return {
    isMainAdmin,
    permissions,
    homePath:
      user?.adminHomePath ??
      firstAllowedAdminPath(permissions, isMainAdmin),
  };
}

export function AdminPermissionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(() => fromUser(null));

  const refresh = async () => {
    if (!session?.accessToken) {
      setState(fromUser(null));
      setLoading(false);
      return;
    }
    try {
      const me = await getMe(session.accessToken);
      setState(fromUser(me));
    } catch {
      setState(fromUser(null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  const value = useMemo<AdminPermissionsContextValue>(
    () => ({
      loading,
      ...state,
      can: (permission: AdminPermission) =>
        adminHasPermission(state.permissions, permission, {
          isMainAdmin: state.isMainAdmin,
        }),
      refresh,
    }),
    [loading, state],
  );

  return (
    <AdminPermissionsContext.Provider value={value}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions() {
  const ctx = useContext(AdminPermissionsContext);
  if (!ctx) {
    throw new Error(
      "useAdminPermissions must be used within AdminPermissionsProvider",
    );
  }
  return ctx;
}
