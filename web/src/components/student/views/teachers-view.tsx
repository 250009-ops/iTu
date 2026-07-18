"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getStudentTeacher } from "@/lib/api/students";
import { getErrorMessage } from "@/lib/api/errors";
import {
  mapPublicExaminer,
  type PublicExaminer,
} from "@/lib/teachers/map-public-teacher";
import { STUDENT_VIEW_PATHS } from "@/lib/student/routes";
import { TeachersDirectory } from "@/components/student/teachers/teachers-directory";
import { TeacherProfilePanel } from "@/components/student/teachers/teacher-profile-panel";

function slugFromPathname(pathname: string): string | null {
  const prefix = `${STUDENT_VIEW_PATHS.teachers}/`;
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).split("/")[0];
  return slug || null;
}

export function TeachersView() {
  const pathname = usePathname();
  const slug = useMemo(() => slugFromPathname(pathname), [pathname]);
  const [teacher, setTeacher] = useState<PublicExaminer | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  const loadTeacher = useCallback(async (teacherSlug: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentTeacher(teacherSlug);
      setTeacher(mapPublicExaminer(data));
    } catch (err) {
      setTeacher(null);
      setError(getErrorMessage(err, "Could not load examiner profile"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!slug) {
      setTeacher(null);
      setLoading(false);
      setError(null);
      return;
    }
    void loadTeacher(slug);
  }, [slug, loadTeacher]);

  return (
    <div className="p-4 lg:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl">
        {slug ? (
          <>
            <Link
              href={STUDENT_VIEW_PATHS.teachers}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-navy"
            >
              <ChevronLeft className="h-4 w-4" /> All examiners
            </Link>

            {loading ? (
              <div className="mt-12 flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
              </div>
            ) : error ? (
              <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
                {error}
              </div>
            ) : teacher ? (
              <div className="mt-6">
                <TeacherProfilePanel teacher={teacher} />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Examiners</h1>
              <p className="mt-1 text-sm text-gray-500">
                Browse certified IELTS examiners by speciality, rating, and availability.
              </p>
            </div>
            <TeachersDirectory />
          </>
        )}
      </div>
    </div>
  );
}
