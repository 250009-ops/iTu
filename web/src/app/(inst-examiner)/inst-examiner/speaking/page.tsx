"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { InstExaminerSpeakingView } from "@/components/inst-examiner/speaking-sessions-view";
import { InstExaminerSpecialityGuard } from "@/components/inst-examiner/speciality-guard";
import { SpeakingConsoleView } from "@/components/teacher/speaking/speaking-console-view";
import { TeacherSpeakingProvider } from "@/contexts/teacher-speaking-context";

function InstExaminerSpeakingContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  if (sessionId) {
    return (
      <TeacherSpeakingProvider>
        <SpeakingConsoleView />
      </TeacherSpeakingProvider>
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
