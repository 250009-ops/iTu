"use client";

import { ScopedBanner } from "@/components/inst-examiner/scoped-banner";
import { SpeakingHubView } from "@/components/teacher/speaking/speaking-hub-view";
import { TeacherSpeakingProvider } from "@/contexts/teacher-speaking-context";
import { useInstExaminer } from "@/contexts/inst-examiner-context";

export function InstExaminerSpeakingView() {
  const { info } = useInstExaminer();
  const centerName = info?.center?.name ?? "your center";

  return (
    <TeacherSpeakingProvider>
      <div className="space-y-6">
        <div className="px-4 pt-4 lg:px-6 xl:px-8">
          <div className="mx-auto max-w-5xl">
            <ScopedBanner
              centerName={centerName}
              message={
                <>
                  Only sessions for students enrolled through{" "}
                  <span className="font-semibold text-navy">{centerName}</span>.
                  Marketplace students are excluded.
                </>
              }
            />
          </div>
        </div>
        <SpeakingHubView variant="centre" />
      </div>
    </TeacherSpeakingProvider>
  );
}
