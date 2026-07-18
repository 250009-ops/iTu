"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStudentLeaderboard,
  getStudentTeachers,
  type StudentLeaderboardResponse,
} from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapPublicExaminer,
  type PublicExaminer,
} from "@/lib/teachers/map-public-teacher";

export function useStudentDashboardExtras() {
  const [leaderboard, setLeaderboard] = useState<StudentLeaderboardResponse | null>(
    null,
  );
  const [examiners, setExaminers] = useState<PublicExaminer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lb, teachers] = await Promise.all([
        getStudentLeaderboard(),
        getStudentTeachers({ limit: 5, activeOnly: true }),
      ]);
      setLeaderboard(lb);
      setExaminers(teachers.map(mapPublicExaminer));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load dashboard extras"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { leaderboard, examiners, loading, error, refresh };
}
