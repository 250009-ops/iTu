"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AttemptsHistory } from "@/components/student/results/attempts-history";
import { ImprovementOpportunities } from "@/components/student/results/improvement-opportunities";
import { ModuleBreakdown } from "@/components/student/results/module-breakdown";
import { NextSteps } from "@/components/student/results/next-steps";
import { OverallScoreCard } from "@/components/student/results/overall-score-card";
import { ResultsEmptyState } from "@/components/student/results/results-empty-state";
import { ResultsHeader } from "@/components/student/results/results-header";
import { ResultsLoadingSkeleton } from "@/components/student/results/results-loading-skeleton";
import { ResultsPendingState } from "@/components/student/results/results-pending-state";
import { ResultsShellHeader } from "@/components/student/results/results-shell-header";
import { ScoreProgressionChart } from "@/components/student/results/score-progression-chart";
import { TargetAchievedCard } from "@/components/student/results/target-achieved-card";
import {
  StudentResultsProvider,
  useStudentResultsData,
} from "@/contexts/student-results-context";

export function ResultsView() {
  return (
    <Suspense fallback={<ResultsLoadingSkeleton />}>
      <ResultsViewWithParams />
    </Suspense>
  );
}

function ResultsViewWithParams() {
  const searchParams = useSearchParams();
  const enrollmentCode = searchParams.get("enrollment");

  return (
    <StudentResultsProvider initialEnrollmentCode={enrollmentCode}>
      <ResultsContent />
    </StudentResultsProvider>
  );
}

function ResultsContent() {
  const { data, loading, error } = useStudentResultsData();

  if (loading) {
    return <ResultsLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-full bg-gray-50/60">
        <ResultsShellHeader subtitle="Track your band scores and progression" />
        <div className="p-8">
          <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
            <p className="font-semibold">Could not load results</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <ResultsEmptyState />;
  }

  if (!data.released) {
    return <ResultsPendingState data={data} />;
  }

  return (
    <div className="min-h-full bg-gray-50/60 print:bg-white">
      <ResultsHeader />

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6 lg:px-8 lg:py-8 print:max-w-none print:px-0 print:py-0">
        <OverallScoreCard />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ModuleBreakdown />
            <AttemptsHistory />
          </div>
          <div className="space-y-6">
            <ScoreProgressionChart />
            <ImprovementOpportunities />
            <TargetAchievedCard />
            <NextSteps />
          </div>
        </div>
      </div>
    </div>
  );
}
