"use client";

import { ApiDataShell } from "@/components/shared/api-data-shell";
import { WritingGradingHub } from "@/components/teacher/grading/writing-grading-hub";
import {
  TeacherGradingProvider,
  useTeacherGrading,
} from "@/contexts/teacher-grading-context";

export function GradingView() {
  return (
    <TeacherGradingProvider>
      <GradingContent />
    </TeacherGradingProvider>
  );
}

function GradingContent() {
  const { loading, error } = useTeacherGrading();

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-6xl">
          <WritingGradingHub />
        </div>
      </div>
    </ApiDataShell>
  );
}
