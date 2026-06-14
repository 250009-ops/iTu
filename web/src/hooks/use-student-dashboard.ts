"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getStudentDashboard,
  type StudentDashboardResponse,
} from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";

export function useStudentDashboard() {
  const [data, setData] = useState<StudentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getStudentDashboard();
      setData(response);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
