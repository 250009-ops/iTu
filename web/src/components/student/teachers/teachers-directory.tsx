"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((teacher) => {
      const haystack = [
        teacher.name,
        teacher.slug,
        teacher.speciality,
        teacher.bio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [teachers, query]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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

        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search examiners</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search examiners…"
            className="h-10 w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : error ? (
        <p className="mt-10 text-center text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          No examiners match this search yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((teacher) => (
            <ExaminerCard key={teacher.id} examiner={teacher} />
          ))}
        </div>
      )}
    </div>
  );
}
