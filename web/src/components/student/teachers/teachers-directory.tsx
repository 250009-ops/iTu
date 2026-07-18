"use client";

import { useCallback, useEffect, useState } from "react";
import { getStudentTeachers } from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapPublicExaminer,
  type PublicExaminer,
  type TeacherSpeciality,
} from "@/lib/teachers/map-public-teacher";
import { ExaminerListRow } from "@/components/student/teachers/examiner-list-row";
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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="mt-6 space-y-2">
          {teachers.map((teacher) => (
            <ExaminerListRow key={teacher.id} examiner={teacher} />
          ))}
        </div>
      )}
    </div>
  );
}
