"use client";

import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";

export function MissedMockBanner() {
  const { data } = useStudentDashboardData();
  const missed = data?.missedMock;

  if (!missed) return null;

  const dateLabel = new Date(missed.mockDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const speakingNoShow = missed.reason === "speaking_no_show";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <CalendarX2 size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-amber-950">
          {speakingNoShow ? "Speaking marked absent" : "Mock day missed"}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
          {speakingNoShow ? (
            <>
              You missed the late-join window for{" "}
              <span className="font-semibold">{missed.packageTitle}</span> on{" "}
              {dateLabel}. Contact your centre admin to reappoint this mock.
            </>
          ) : (
            <>
              You did not start{" "}
              <span className="font-semibold">{missed.packageTitle}</span> on{" "}
              {dateLabel} before the day cutoff. Contact your centre admin to
              reappoint this mock.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-amber-800/80">
          Reappointment is available for both complimentary and paid mocks once
          a session is marked missed.
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <Link href="/student/mock-day">
          <Button
            variant="secondary"
            size="sm"
            className="w-full border-amber-200 bg-white text-amber-900 hover:bg-amber-100 sm:w-auto"
          >
            View Mock Day Hub
          </Button>
        </Link>
        <Link href="/student/browse">
          <Button
            variant="secondary"
            size="sm"
            className="w-full border-amber-200 bg-transparent text-amber-900 hover:bg-amber-100/60 sm:w-auto"
          >
            Book Another Mock
          </Button>
        </Link>
      </div>
    </div>
  );
}
