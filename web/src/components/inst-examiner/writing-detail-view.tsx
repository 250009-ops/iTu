"use client";

import { ScopedBanner } from "@/components/inst-examiner/scoped-banner";
import { WritingGradingView } from "@/components/teacher/grading/writing-grading-view";
import { useInstExaminer } from "@/contexts/inst-examiner-context";

export function InstExaminerWritingDetailView({
  submissionId,
}: {
  submissionId: string;
}) {
  const { info } = useInstExaminer();
  const centerName = info?.center?.name ?? "your center";

  return (
    <div className="space-y-4">
      <div className="px-4 pt-4 lg:px-6 xl:px-8">
        <div className="mx-auto max-w-6xl">
          <ScopedBanner
            centerName={centerName}
            message={
              <>
                Centre submission — student enrolled through{" "}
                <span className="font-semibold text-navy">{centerName}</span>.
              </>
            }
          />
        </div>
      </div>
      <WritingGradingView submissionId={submissionId} />
    </div>
  );
}
