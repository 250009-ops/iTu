"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import type { StudentDashboardResponse } from "@/lib/api/students";
import type { StudentPortal } from "@/lib/student/portal";

type ResultsAlert = NonNullable<StudentDashboardResponse["resultsAlert"]>;

type ResultsBannerProps = {
  /** Defaults to marketplace. Remaps marketplace result links for institution. */
  portal?: StudentPortal;
  /**
   * When provided, skips marketplace dashboard context.
   * Pass `null` to render nothing without requiring the provider.
   */
  resultsAlert?: ResultsAlert | null;
};

export function ResultsBanner(props: ResultsBannerProps = {}) {
  if ("resultsAlert" in props) {
    return (
      <ResultsBannerInner
        portal={props.portal ?? "marketplace"}
        alert={props.resultsAlert ?? null}
      />
    );
  }
  return <ResultsBannerFromContext portal={props.portal} />;
}

function ResultsBannerFromContext({
  portal = "marketplace",
}: {
  portal?: StudentPortal;
}) {
  const { data } = useStudentDashboardData();
  return (
    <ResultsBannerInner
      portal={portal}
      alert={data?.resultsAlert ?? null}
    />
  );
}

function resultsHrefForPortal(
  href: string,
  portal: StudentPortal,
): string {
  if (portal !== "institution") return href;
  if (href.startsWith("/inst-student")) return href;
  // Marketplace-shaped links from older notifications → centre results.
  if (href.startsWith("/student/results")) {
    return href.replace(/^\/student\/results/, "/inst-student/results");
  }
  return "/inst-student/results";
}

function ResultsBannerInner({
  portal,
  alert,
}: {
  portal: StudentPortal;
  alert: ResultsAlert | null;
}) {
  if (!alert) return null;

  const href = resultsHrefForPortal(alert.href, portal);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div>
        <p className="font-semibold text-sky-900">{alert.title}</p>
        <p className="mt-0.5 text-sm text-sky-700">{alert.message}</p>
      </div>
      <Link href={href}>
        <Button
          variant="secondary"
          size="sm"
          className="w-full border-sky-200 bg-white text-sky-800 hover:bg-sky-100 sm:w-auto"
        >
          View Results
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
