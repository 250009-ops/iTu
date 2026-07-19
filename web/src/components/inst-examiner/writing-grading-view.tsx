"use client";

import { ApiDataShell } from "@/components/shared/api-data-shell";
import { ScopedBanner } from "@/components/inst-examiner/scoped-banner";
import { WritingGradingHub } from "@/components/teacher/grading/writing-grading-hub";
import {
  TeacherGradingProvider,
  useTeacherGrading,
} from "@/contexts/teacher-grading-context";
import { useInstExaminer } from "@/contexts/inst-examiner-context";

export function InstExaminerWritingView() {
  return (
    <TeacherGradingProvider>
      <InstExaminerGradingContent />
    </TeacherGradingProvider>
  );
}

function InstExaminerGradingContent() {
  const { loading, error } = useTeacherGrading();
  const { info } = useInstExaminer();
  const centerName = info?.center?.name ?? "your center";

  return (
    <ApiDataShell loading={loading} error={error}>
      <div className="p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <ScopedBanner
            centerName={centerName}
            message={
              <>
                All submissions below are exclusively from{" "}
                <span className="font-semibold text-navy">{centerName}</span>{" "}
                students. No marketplace assignments appear here.
              </>
            }
          />
          <WritingGradingHub variant="centre" />
        </div>
      </div>
    </ApiDataShell>
  );
}
