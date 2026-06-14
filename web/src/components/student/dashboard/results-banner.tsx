"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";

export function ResultsBanner() {
  const { data } = useStudentDashboardData();
  const alert = data?.resultsAlert;

  if (!alert) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div>
        <p className="font-semibold text-sky-900">{alert.title}</p>
        <p className="mt-0.5 text-sm text-sky-700">{alert.message}</p>
      </div>
      <Link href={alert.href}>
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
