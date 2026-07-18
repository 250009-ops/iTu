"use client";

import { useCallback, useEffect, useState } from "react";
import { getStudentTeachers } from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapPublicExaminer,
  type PublicExaminer,
  type TeacherSpeciality,
} from "@/lib/teachers/map-public-teacher";
import { ExaminerCard } from "@/components/student/teachers/examiner-card";
import { cn } from "@/lib/utils";

type Filter = "All" | TeacherSpeciality;
const FILTERS: Filter[] = ["All", "Writing", "Speaking", "Writing & Speaking"];

const SPECIALITY_QUERY: Record<
  Exclude<Filter, "All">,
  "writing" | "speaking" | "both"
> = {
  Writing: "writing",
  Speaking: "speaking",
  "Writing & Speaking": "both",
};

export function TeachersDirectory() {
  const [filter, setFilter] = useState<Filter>("All");
  const [teachers, setTeachers] = useState<PublicExaminer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const speciality =
        filter === "All" ? undefined : SPECIALITY_QUERY[filter];
      const data = await getStudentTeachers({ speciality });
      setTeachers(data.map(mapPublicExaminer));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load examiners"));
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const topRated = teachers.filter((t) => t.isTopRated);

  return (
    <div>
      {topRated.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Top rated
          </span>
          {topRated.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-sm font-medium text-navy shadow-sm"
            >
              {t.name}
              {t.rating > 0 ? (
                <span className="text-xs text-amber-600">{t.rating}★</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className={cn("flex flex-wrap items-center gap-2", topRated.length > 0 && "mt-6")}>
        <span className="mr-1 text-sm font-medium text-gray-500">Speciality:</span>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f
                ? "bg-navy text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:text-navy",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-600">{error}</p>
      ) : teachers.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          No examiners match this filter yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher) => (
            <ExaminerCard key={teacher.id} examiner={teacher} />
          ))}
        </div>
      )}
    </div>
  );
}
