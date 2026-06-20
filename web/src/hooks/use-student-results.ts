"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapPendingStudentResults,
  mapStudentResults,
  type StudentResultsData,
} from "@/lib/api/mappers/student";
import { getPendingResult, getResult, listResults } from "@/lib/api/results";
import { getStudentProfile } from "@/lib/api/students";

function examTypeLabel(examType?: string) {
  switch (examType?.toLowerCase()) {
    case "general_training":
      return "General Training IELTS";
    case "academic":
    default:
      return "Academic IELTS";
  }
}

export function useStudentResults() {
  const [data, setData] = useState<StudentResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedCodeRef = useRef<string | null>(null);
  const listCacheRef = useRef<Awaited<ReturnType<typeof listResults>>>([]);
  const detailCacheRef = useRef<
    Record<string, Awaited<ReturnType<typeof getResult>>>
  >({});
  const targetBandRef = useRef<number | null>(null);
  const examTypeRef = useRef("Academic IELTS");

  const applySelection = useCallback((code: string) => {
    selectedCodeRef.current = code;
    setData(
      mapStudentResults(
        listCacheRef.current,
        detailCacheRef.current,
        code,
        targetBandRef.current,
        examTypeRef.current,
      ),
    );
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, pending, profile] = await Promise.all([
        listResults(),
        getPendingResult().catch(() => null),
        getStudentProfile().catch(() => null),
      ]);
      targetBandRef.current = profile?.targetBand ?? null;
      examTypeRef.current = examTypeLabel(profile?.examType);

      if (!list.length) {
        listCacheRef.current = [];
        detailCacheRef.current = {};
        selectedCodeRef.current = null;
        if (pending) {
          setData(mapPendingStudentResults(pending, targetBandRef.current));
        } else {
          setData(null);
        }
        return;
      }

      const details = await Promise.all(
        list.map((item) => getResult(item.enrollmentCode)),
      );
      const detailByCode = Object.fromEntries(
        details.map((detail) => [detail.enrollmentCode ?? "", detail]),
      );

      listCacheRef.current = list;
      detailCacheRef.current = detailByCode;

      const preferred = selectedCodeRef.current ?? list[0]!.enrollmentCode;
      const resolvedCode = list.some((item) => item.enrollmentCode === preferred)
        ? preferred
        : list[0]!.enrollmentCode;

      applySelection(resolvedCode);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load results"));
    } finally {
      setLoading(false);
    }
  }, [applySelection]);

  const selectAttempt = useCallback(
    (enrollmentCode: string) => {
      applySelection(enrollmentCode);
    },
    [applySelection],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh, selectAttempt };
}
