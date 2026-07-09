"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getTeacherAvailability, getTeacherProfile } from "@/lib/api/teachers";
import {
  mapTeacherProfile,
  mapWeeklyAvailability,
} from "@/lib/api/mappers/teacher";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";

type TeacherProfileValue = {
  loading: boolean;
  error: string | null;
  profile: ReturnType<typeof mapTeacherProfile>;
  raw: {
    name: string;
    bio: string | null;
    speciality: string;
    notificationPrefs: Record<string, boolean> | null;
  };
  refresh: () => Promise<void>;
};

const emptyProfile = mapTeacherProfile({
  name: "Teacher",
  email: "",
  bio: null,
  avatarUrl: null,
  notificationPrefs: null,
  credentials: null,
  languages: [],
  speciality: "both",
  rating: null,
  reviewCount: 0,
  totalSessions: 0,
  totalEarned: 0,
  status: "pending",
  memberSince: new Date().toISOString(),
  emailVerified: false,
  sessionActivityMonths: [],
});

const TeacherProfileContext = createContext<TeacherProfileValue | null>(null);

export function TeacherProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const profileQuery = useApiQuery(getTeacherProfile, [session?.accessToken]);
  const availabilityQuery = useApiQuery(getTeacherAvailability, [
    session?.accessToken,
  ]);

  const value = useMemo<TeacherProfileValue>(() => {
    const base = profileQuery.data
      ? mapTeacherProfile(profileQuery.data)
      : emptyProfile;

    const profile = availabilityQuery.data
      ? {
          ...base,
          availability: mapWeeklyAvailability(availabilityQuery.data.weekly),
        }
      : base;

    return {
      loading: profileQuery.loading || availabilityQuery.loading,
      error: profileQuery.error ?? availabilityQuery.error,
      profile,
      raw: {
        name: profileQuery.data?.name ?? "",
        bio: profileQuery.data?.bio ?? null,
        speciality: profileQuery.data?.speciality ?? "both",
        notificationPrefs: profileQuery.data?.notificationPrefs ?? null,
      },
      refresh: profileQuery.refresh,
    };
  }, [profileQuery, availabilityQuery]);

  return (
    <TeacherProfileContext.Provider value={value}>
      {children}
    </TeacherProfileContext.Provider>
  );
}

export function useTeacherProfile() {
  const ctx = useContext(TeacherProfileContext);
  if (!ctx) {
    throw new Error("useTeacherProfile requires TeacherProfileProvider");
  }
  return ctx;
}
