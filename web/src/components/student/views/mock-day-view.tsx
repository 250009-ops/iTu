"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { CurrentStatusBanner } from "@/components/student/mock-day/current-status-banner";
import { ExamRulesBanner } from "@/components/student/mock-day/exam-rules-banner";
import { MockDayEmptyState } from "@/components/student/mock-day/mock-day-empty-state";
import { MockDayHeader } from "@/components/student/mock-day/mock-day-header";
import { MockDayLoadingSkeleton } from "@/components/student/mock-day/mock-day-loading-skeleton";
import { MockDayShellHeader } from "@/components/student/mock-day/mock-day-shell-header";
import { MockDaySidebar } from "@/components/student/mock-day/mock-day-sidebar";
import { ScheduleTimeline } from "@/components/student/mock-day/schedule-timeline";
import { SectionCards } from "@/components/student/mock-day/section-cards";
import {
  StudentMockDayProvider,
  useStudentMockDayData,
} from "@/contexts/student-mock-day-context";
import type { StudentPortal } from "@/lib/student/portal";

type MockDayViewProps = {
  portal?: StudentPortal;
  institutionLabel?: string;
};

export function MockDayView({
  portal = "marketplace",
  institutionLabel = "your centre",
}: MockDayViewProps) {
  return (
    <StudentMockDayProvider>
      <MockDayContent portal={portal} institutionLabel={institutionLabel} />
    </StudentMockDayProvider>
  );
}

function MockDayContent({
  portal,
  institutionLabel,
}: Required<MockDayViewProps>) {
  const { data, loading, error } = useStudentMockDayData();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isInstitution = portal === "institution";
  const welcomeSkill = searchParams.get("welcome");
  const showWelcomeBanner =
    !isInstitution &&
    (welcomeSkill === "listening" || welcomeSkill === "reading");

  useEffect(() => {
    if (isInstitution || searchParams.get("payment") !== "success") return;
    toast("Payment confirmed", {
      description:
        "Your mock is booked. Mock Day Hub is ready when exam day arrives.",
      variant: "success",
    });
  }, [searchParams, toast, isInstitution]);

  useEffect(() => {
    if (!showWelcomeBanner) return;
    const label = welcomeSkill === "listening" ? "Listening" : "Reading";
    toast("Welcome gift claimed", {
      description: `Your free ${label} mock is ready in Mock Day Hub.`,
      variant: "success",
    });
  }, [showWelcomeBanner, welcomeSkill, toast]);

  if (loading) {
    return <MockDayLoadingSkeleton portal={portal} />;
  }

  if (error) {
    return (
      <div>
        <MockDayShellHeader
          portal={portal}
          subtitle={
            isInstitution
              ? "Your centre-assigned mock exam"
              : "Your exam-day command center"
          }
        />
        <div className="p-8">
          <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
            <p className="font-semibold">Could not load session details</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <MockDayEmptyState portal={portal} institutionLabel={institutionLabel} />
    );
  }

  return (
    <div>
      <MockDayHeader portal={portal} />
      {!isInstitution && searchParams.get("payment") === "success" ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-sm text-emerald-900">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              <strong>Payment successful.</strong> Your mock is confirmed — use
              this hub on exam day to check in and start each section.
            </span>
          </div>
        </div>
      ) : null}
      {showWelcomeBanner ? (
        <div className="border-b border-sky-200 bg-sky-50 px-6 py-3 text-sm text-sky-900">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
            <span>
              <strong>Welcome gift booked.</strong> Your free{" "}
              {welcomeSkill === "listening" ? "Listening" : "Reading"} mock is
              confirmed — check in below on mock day to begin.
            </span>
          </div>
        </div>
      ) : null}
      <CurrentStatusBanner />

      <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <ExamRulesBanner />
            <SectionCards
              portal={portal}
              focusSectionId={showWelcomeBanner ? welcomeSkill : null}
            />
          </div>

          <div className="space-y-4 lg:col-span-4">
            <ScheduleTimeline />
            <MockDaySidebar portal={portal} />
          </div>
        </div>
      </div>
    </div>
  );
}
