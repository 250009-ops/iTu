"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapMockDayHub,
  type MockDaySession,
} from "@/lib/api/mappers/student";
import { getMockDayHub } from "@/lib/api/students";

export function useStudentMockDay() {
  const [data, setData] = useState<MockDaySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMockDayHub();
      setData(mapMockDayHub(response));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load mock day hub"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
