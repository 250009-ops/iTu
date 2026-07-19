"use client";

import { MockDayView } from "@/components/student/views/mock-day-view";
import { useInstStudent } from "@/contexts/inst-student-context";

export function InstStudentMyMockView() {
  const { info } = useInstStudent();
  const centerName = info?.center?.name ?? "your centre";

  return (
    <MockDayView portal="institution" institutionLabel={centerName} />
  );
}
