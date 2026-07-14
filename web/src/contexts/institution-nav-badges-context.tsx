"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { getInstitutionOverview } from "@/lib/api/institution";
import { useApiQuery } from "@/hooks/use-api-query";

type InstitutionNavBadgesValue = {
  pendingStudents: number;
  centerName: string | null;
  loading: boolean;
};

const InstitutionNavBadgesContext =
  createContext<InstitutionNavBadgesValue | null>(null);

export function InstitutionNavBadgesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data, loading, refresh } = useApiQuery(getInstitutionOverview);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh({ silent: true });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const value = useMemo<InstitutionNavBadgesValue>(
    () => ({
      pendingStudents: data?.pendingStudents ?? 0,
      centerName: data?.centerName ?? null,
      loading,
    }),
    [data, loading],
  );

  return (
    <InstitutionNavBadgesContext.Provider value={value}>
      {children}
    </InstitutionNavBadgesContext.Provider>
  );
}

export function useInstitutionNavBadges() {
  const ctx = useContext(InstitutionNavBadgesContext);
  if (!ctx) {
    throw new Error(
      "useInstitutionNavBadges requires InstitutionNavBadgesProvider",
    );
  }
  return ctx;
}
