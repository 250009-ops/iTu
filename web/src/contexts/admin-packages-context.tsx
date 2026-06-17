"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clonePackage,
  createPackage,
  deletePackage,
  getAdminPackages,
  updatePackage,
  type AdminPackagePayload,
} from "@/lib/api/admin";
import { useApiQuery } from "@/hooks/use-api-query";
import type { AdminContentTestOption, AdminPackage } from "@/lib/admin/types";

type PackagesSummary = {
  total: number;
  active: number;
  mostPopular: number;
  avgPrice: number;
};

type EditorState = { open: boolean; pkg: AdminPackage | null };

type PackagesValue = {
  loading: boolean;
  error: string | null;
  packages: AdminPackage[];
  contentTests: AdminContentTestOption[];
  summary: PackagesSummary;
  editor: EditorState;
  openEditor: (pkg: AdminPackage | null) => void;
  closeEditor: () => void;
  savePackage: (id: string | null, payload: AdminPackagePayload) => Promise<void>;
  removePackage: (id: string) => Promise<{ archived?: boolean; deleted?: boolean }>;
  duplicatePackage: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminPackagesContext = createContext<PackagesValue | null>(null);

export function AdminPackagesProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refresh } = useApiQuery(getAdminPackages);
  const [editor, setEditor] = useState<EditorState>({ open: false, pkg: null });

  const packages = useMemo(() => data?.packages ?? [], [data]);
  const contentTests = useMemo(() => data?.contentTests ?? [], [data]);

  const summary = useMemo<PackagesSummary>(() => {
    const active = packages.filter((p) => p.isActive);
    const avgPrice =
      active.length > 0
        ? Math.round(
            active.reduce((sum, p) => sum + p.price, 0) / active.length,
          )
        : 0;
    return {
      total: packages.length,
      active: active.length,
      mostPopular: packages.filter((p) => p.mostPopular).length,
      avgPrice,
    };
  }, [packages]);

  const openEditor = useCallback(
    (pkg: AdminPackage | null) => setEditor({ open: true, pkg }),
    [],
  );
  const closeEditor = useCallback(
    () => setEditor({ open: false, pkg: null }),
    [],
  );

  const savePackage = useCallback(
    async (id: string | null, payload: AdminPackagePayload) => {
      if (id) {
        await updatePackage(id, payload);
      } else {
        await createPackage(payload);
      }
      await refresh();
    },
    [refresh],
  );

  const removePackage = useCallback(
    async (id: string) => {
      const result = await deletePackage(id);
      await refresh();
      return result;
    },
    [refresh],
  );

  const duplicatePackage = useCallback(
    async (id: string) => {
      await clonePackage(id);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<PackagesValue>(
    () => ({
      loading,
      error,
      packages,
      contentTests,
      summary,
      editor,
      openEditor,
      closeEditor,
      savePackage,
      removePackage,
      duplicatePackage,
      refresh,
    }),
    [
      loading,
      error,
      packages,
      contentTests,
      summary,
      editor,
      openEditor,
      closeEditor,
      savePackage,
      removePackage,
      duplicatePackage,
      refresh,
    ],
  );

  return (
    <AdminPackagesContext.Provider value={value}>
      {children}
    </AdminPackagesContext.Provider>
  );
}

export function useAdminPackages() {
  const ctx = useContext(AdminPackagesContext);
  if (!ctx) {
    throw new Error("useAdminPackages requires AdminPackagesProvider");
  }
  return ctx;
}
