"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapPendingStudentResults,
  mapStudentResults,
  type StudentResultsData,
} from "@/lib/api/mappers/student";
import { getPendingResult, getResult, listResults } from "@/lib/api/results";
import { getStudentProfile } from "@/lib/api/students";

export function useStudentResults() {
  const [data, setData] = useState<StudentResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, pending, profile] = await Promise.all([
        listResults(),
        getPendingResult().catch(() => null),
        getStudentProfile().catch(() => null),
      ]);
      const targetBand = profile?.targetBand ?? null;

      if (!list.length) {
        if (pending) {
          setData(mapPendingStudentResults(pending, targetBand));
        } else {
          setData(null);
        }
        return;
      }

      const detail = await getResult(list[0].enrollmentCode);
      setData(mapStudentResults(list, detail, targetBand));
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
