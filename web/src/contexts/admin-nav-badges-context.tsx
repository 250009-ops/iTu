"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { getAdminNavBadges } from "@/lib/api/admin";
import { useApiQuery } from "@/hooks/use-api-query";

type AdminNavBadgesValue = {
  liveSessions: number;
  openTickets: number;
  loading: boolean;
};

const AdminNavBadgesContext = createContext<AdminNavBadgesValue | null>(null);

export function AdminNavBadgesProvider({ children }: { children: ReactNode }) {
  const { data, loading, refresh } = useApiQuery(getAdminNavBadges);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const value = useMemo<AdminNavBadgesValue>(
    () => ({
      liveSessions: data?.liveSessions ?? 0,
      openTickets: data?.openTickets ?? 0,
      loading,
    }),
    [data, loading],
  );

  return (
    <AdminNavBadgesContext.Provider value={value}>
      {children}
    </AdminNavBadgesContext.Provider>
  );
}

export function useAdminNavBadges() {
  const ctx = useContext(AdminNavBadgesContext);
  if (!ctx) {
    throw new Error("useAdminNavBadges requires AdminNavBadgesProvider");
  }
  return ctx;
}
