"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInstExaminer } from "@/contexts/inst-examiner-context";
import {
  canAccessSpeaking,
  canAccessWriting,
  type ExaminerSpeciality,
} from "@/lib/inst-examiner/speciality";

type SpecialityArea = "speaking" | "writing";

function isAllowed(area: SpecialityArea, speciality: ExaminerSpeciality): boolean {
  return area === "speaking"
    ? canAccessSpeaking(speciality)
    : canAccessWriting(speciality);
}

export function InstExaminerSpecialityGuard({
  area,
  children,
}: {
  area: SpecialityArea;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, speciality } = useInstExaminer();

  useEffect(() => {
    if (loading) return;
    if (!isAllowed(area, speciality)) {
      router.replace("/inst-examiner");
    }
  }, [area, loading, router, speciality]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!isAllowed(area, speciality)) return null;

  return <>{children}</>;
}
