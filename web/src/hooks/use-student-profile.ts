"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapStudentProfile,
  type StudentProfileUi,
} from "@/lib/api/mappers/student";
import {
  getStudentProfile,
  updateStudentProfile,
  type UpdateProfileBody,
} from "@/lib/api/students";
import { useAuth } from "@/hooks/use-auth";

export function useStudentProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<StudentProfileUi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getStudentProfile();
      const displayName = response?.name ?? session?.name ?? "Student";
      setProfile(mapStudentProfile(response, displayName));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load profile"));
    } finally {
      setLoading(false);
    }
  }, [session?.name]);

  const update = useCallback(
    async (body: UpdateProfileBody) => {
      const response = await updateStudentProfile(body);
      const displayName = response?.name ?? session?.name ?? "Student";
      setProfile(mapStudentProfile(response, displayName));
    },
    [session?.name],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, error, refresh, update };
}
