"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarX2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentDashboardData } from "@/contexts/student-dashboard-context";
import type { StudentDashboardResponse } from "@/lib/api/students";
import { calendarDaysSince } from "@/lib/student/datetime";
import {
  dismissMissedMock,
  isMissedMockDismissed,
  MISSED_MOCK_DISMISS_AFTER_DAYS,
} from "@/lib/student/missed-mock-dismiss";
import {
  studentMockDayHref,
  type StudentPortal,
} from "@/lib/student/portal";

type MissedMock = NonNullable<StudentDashboardResponse["missedMock"]>;

type MissedMockBannerProps = {
  /** Defaults to marketplace. Institution hides Browse CTAs. */
  portal?: StudentPortal;
  /**
   * When provided, skips marketplace dashboard context.
   * Pass `null` to render nothing without requiring the provider.
   */
  missedMock?: MissedMock | null;
};

export function MissedMockBanner(props: MissedMockBannerProps = {}) {
  if ("missedMock" in props) {
    return (
      <MissedMockBannerInner
        portal={props.portal ?? "marketplace"}
        missed={props.missedMock ?? null}
      />
    );
  }
  return <MissedMockBannerFromContext portal={props.portal} />;
}

function MissedMockBannerFromContext({
  portal = "marketplace",
}: {
  portal?: StudentPortal;
}) {
  const { data } = useStudentDashboardData();
  return (
    <MissedMockBannerInner
      portal={portal}
      missed={data?.missedMock ?? null}
    />
  );
}

function MissedMockBannerInner({
  portal,
  missed,
}: {
  portal: StudentPortal;
  missed: MissedMock | null;
}) {
  const enrollmentCode = missed?.enrollmentCode?.trim() ?? "";
  const canDismiss =
    missed != null &&
    enrollmentCode.length > 0 &&
    calendarDaysSince(missed.mockDate) >= MISSED_MOCK_DISMISS_AFTER_DAYS;

  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!missed || !canDismiss) {
      setDismissed(false);
      setHydrated(true);
      return;
    }
    setDismissed(isMissedMockDismissed(enrollmentCode));
    setHydrated(true);
  }, [missed, canDismiss, enrollmentCode]);

  if (!missed) return null;
  // Avoid a flash of a previously-dismissed banner after localStorage loads.
  if (canDismiss && !hydrated) return null;
  if (dismissed) return null;

  const dateLabel = new Date(missed.mockDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const speakingNoShow = missed.reason === "speaking_no_show";
  const mockDayHref = studentMockDayHref(portal);
  const isInstitution = portal === "institution";

  function handleDismiss() {
    if (!canDismiss) return;
    dismissMissedMock(enrollmentCode);
    setDismissed(true);
  }

  return (
    <div className="relative flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
      {canDismiss && (
        <button
          type="button"
          aria-label="Dismiss missed mock warning"
          onClick={handleDismiss}
          className="absolute right-2.5 top-2.5 rounded-md p-1 text-amber-700/70 hover:bg-amber-100 hover:text-amber-950"
        >
          <X size={15} />
        </button>
      )}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <CalendarX2 size={22} />
      </div>
      <div className={`min-w-0 flex-1 ${canDismiss ? "pr-6" : ""}`}>
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
        <Link href={mockDayHref}>
          <Button
            variant="secondary"
            size="sm"
            className="w-full border-amber-200 bg-white text-amber-900 hover:bg-amber-100 sm:w-auto"
          >
            {isInstitution ? "View My Mock" : "View Mock Day Hub"}
          </Button>
        </Link>
        {!isInstitution && (
          <Link href="/student/browse">
            <Button
              variant="secondary"
              size="sm"
              className="w-full border-amber-200 bg-transparent text-amber-900 hover:bg-amber-100/60 sm:w-auto"
            >
              Book Another Mock
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
