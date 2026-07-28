"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ScopedBanner } from "@/components/inst-examiner/scoped-banner";
import { InstExaminerSpeakingView } from "@/components/inst-examiner/speaking-sessions-view";
import { InstExaminerSpecialityGuard } from "@/components/inst-examiner/speciality-guard";
import { SpeakingConsoleView } from "@/components/teacher/speaking/speaking-console-view";
import { useInstExaminer } from "@/contexts/inst-examiner-context";

function InstExaminerSpeakingContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const { info } = useInstExaminer();
  const centerName = info?.center?.name ?? "your center";

  if (sessionId) {
    // SpeakingConsoleView already mounts TeacherSpeakingProvider — do not nest another.
    return (
      <div className="space-y-4">
        <div className="px-4 pt-4 lg:px-6 xl:px-8">
          <div className="mx-auto max-w-5xl">
            <ScopedBanner
              centerName={centerName}
              message={
                <>
                  Centre session only — student enrolled through{" "}
                  <span className="font-semibold text-navy">{centerName}</span>.
                </>
              }
            />
          </div>
        </div>
        <SpeakingConsoleView />
      </div>
    );
  }

  return <InstExaminerSpeakingView />;
}

export default function InstExaminerSpeakingPage() {
  return (
    <InstExaminerSpecialityGuard area="speaking">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        }
      >
        <InstExaminerSpeakingContent />
      </Suspense>
    </InstExaminerSpecialityGuard>
  );
}
