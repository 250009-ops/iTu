"use client";

import { CalendarX2 } from "lucide-react";
import { MockDayShellHeader } from "@/components/student/mock-day/mock-day-shell-header";

export function MockDayMissedState({
  packageTitle,
  dateLabel,
}: {
  packageTitle: string;
  dateLabel: string;
}) {
  return (
    <div>
      <MockDayShellHeader subtitle="Your exam-day command center" />
      <div className="mx-auto max-w-lg px-6 py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <CalendarX2 size={28} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-navy">Mock day missed</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
            You did not start <span className="font-semibold">{packageTitle}</span>{" "}
            on {dateLabel} before the day cutoff. Contact your centre admin to
            reappoint this mock.
          </p>
          <p className="mt-4 text-xs text-amber-800/80">
            Reappointment is available for both complimentary and paid mocks once
            a session is marked missed.
          </p>
        </div>
      </div>
    </div>
  );
}
