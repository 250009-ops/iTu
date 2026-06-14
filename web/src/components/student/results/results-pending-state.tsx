"use client";

import Link from "next/link";
import { ArrowRight, Clock, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsShellHeader } from "@/components/student/results/results-shell-header";
import type { StudentResultsData } from "@/lib/api/mappers/student";

export function ResultsPendingState({ data }: { data: StudentResultsData }) {
  return (
    <div className="min-h-full bg-gray-50/60">
      <ResultsShellHeader
        title={data.title}
        subtitle={data.subtitle}
        actions={
          <Link href="/student/mock-day">
            <Button variant="secondary" size="sm">
              Open Mock Day Hub
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl px-6 py-12 lg:py-16">
        <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock size={28} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-navy">Results pending</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {data.message ??
              "Your results will appear here once all sections are graded and released together."}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/student/mock-day">
              <Button variant="danger">
                Continue Mock
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href={`mailto:proctor@ielts-mock.com?subject=Results%20inquiry%20-%20${data.mockId}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:underline"
            >
              <Headphones size={15} />
              Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
