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

function syncEnrollmentParam(code: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("enrollment", code);
  window.history.replaceState(null, "", url.toString());
}

export function useStudentResults(initialEnrollmentCode?: string | null) {
  const [data, setData] = useState<StudentResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedCodeRef = useRef<string | null>(initialEnrollmentCode ?? null);
  const listCacheRef = useRef<Awaited<ReturnType<typeof listResults>>>([]);
  const detailCacheRef = useRef<
    Record<string, Awaited<ReturnType<typeof getResult>>>
  >({});
  const targetBandRef = useRef<number | null>(null);
  const examTypeRef = useRef("Academic IELTS");

  useEffect(() => {
    if (initialEnrollmentCode) {
      selectedCodeRef.current = initialEnrollmentCode;
    }
  }, [initialEnrollmentCode]);

  const applySelection = useCallback((code: string) => {
    selectedCodeRef.current = code;
    syncEnrollmentParam(code);
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

      const preferred =
        selectedCodeRef.current ??
        initialEnrollmentCode ??
        list[0]?.enrollmentCode ??
        pending?.enrollmentCode ??
        null;

      const codesToFetch = new Set(list.map((item) => item.enrollmentCode));
      if (preferred) codesToFetch.add(preferred);

      const details = await Promise.all(
        [...codesToFetch].map(async (code) => {
          try {
            return await getResult(code);
          } catch {
            return null;
          }
        }),
      );
      const detailByCode = Object.fromEntries(
        details
          .filter((detail): detail is NonNullable<typeof detail> => !!detail)
          .map((detail) => [detail.enrollmentCode ?? "", detail]),
      );

      listCacheRef.current = list;
      detailCacheRef.current = detailByCode;

      if (!list.length && !preferred) {
        selectedCodeRef.current = null;
        if (pending) {
          setData(
            mapPendingStudentResults(
              pending,
              targetBandRef.current,
              examTypeRef.current,
            ),
          );
        } else {
          setData(null);
        }
        return;
      }

      const resolvedCode =
        (preferred &&
          (detailByCode[preferred] ||
            list.some((item) => item.enrollmentCode === preferred)) &&
          preferred) ||
        list[0]?.enrollmentCode ||
        preferred;

      if (!resolvedCode) {
        setData(null);
        return;
      }

      applySelection(resolvedCode);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load results"));
    } finally {
      setLoading(false);
    }
  }, [applySelection, initialEnrollmentCode]);

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
