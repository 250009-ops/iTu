"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getInstExaminerOverview,
  type InstExaminerOverview,
} from "@/lib/api/inst-examiner";

export type ProfilePortalVariant = "marketplace" | "centre";

type ProfilePortalValue = {
  variant: ProfilePortalVariant;
  centerName: string | null;
  overview: InstExaminerOverview | null;
  overviewLoading: boolean;
};

const ProfilePortalContext = createContext<ProfilePortalValue>({
  variant: "marketplace",
  centerName: null,
  overview: null,
  overviewLoading: false,
});

export function ProfilePortalProvider({
  variant,
  centerName,
  children,
}: {
  variant: ProfilePortalVariant;
  centerName?: string | null;
  children: ReactNode;
}) {
  const [overview, setOverview] = useState<InstExaminerOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(variant === "centre");

  useEffect(() => {
    if (variant !== "centre") {
      setOverview(null);
      setOverviewLoading(false);
      return;
    }

    let cancelled = false;
    setOverviewLoading(true);
    void getInstExaminerOverview()
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [variant]);

  return (
    <ProfilePortalContext.Provider
      value={{
        variant,
        centerName: centerName ?? overview?.center?.name ?? null,
        overview,
        overviewLoading,
      }}
    >
      {children}
    </ProfilePortalContext.Provider>
  );
}

export function useProfilePortal() {
  return useContext(ProfilePortalContext);
}
