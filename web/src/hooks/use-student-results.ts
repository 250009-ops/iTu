"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapStudentResults,
  type StudentResultsData,
} from "@/lib/api/mappers/student";
import { getResult, listResults } from "@/lib/api/results";
import { getStudentProfile } from "@/lib/api/students";

export function useStudentResults() {
  const [data, setData] = useState<StudentResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, profile] = await Promise.all([
        listResults(),
        getStudentProfile().catch(() => null),
      ]);

      if (!list.length) {
        setData(null);
        return;
      }

      const detail = await getResult(list[0].enrollmentCode);
      setData(
        mapStudentResults(list, detail, profile?.targetBand ?? null),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load results"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
