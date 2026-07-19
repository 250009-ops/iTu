"use client";

import { ResultsView } from "@/components/student/views/results-view";
import { useInstStudent } from "@/contexts/inst-student-context";

export function InstStudentResultsView() {
  const { info } = useInstStudent();
  const centerName = info?.center?.name ?? "your centre";

  return (
    <ResultsView portal="institution" institutionLabel={centerName} />
  );
}
