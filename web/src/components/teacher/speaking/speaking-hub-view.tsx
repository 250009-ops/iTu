"use client";

import { useEffect, useState } from "react";
import { NextSessionHero } from "@/components/teacher/speaking/next-session-hero";
import { SpeakingCompletedTable } from "@/components/teacher/speaking/speaking-completed-table";
import {
  SpeakingSessionsList,
  SpeakingUpcomingList,
} from "@/components/teacher/speaking/speaking-sessions-list";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";

type SpeakingTab = "today" | "upcoming" | "awaiting" | "completed";

function cnTab(active: boolean) {
  return [
    "inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors",
    active
      ? "border-brand-red text-brand-red"
      : "border-transparent text-muted hover:text-navy",
  ].join(" ");
}

function cnCount(active: boolean, emphasize?: boolean) {
  return [
    "rounded-full px-2 py-0.5 text-[11px] font-bold",
    active
      ? emphasize
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-brand-red"
      : emphasize && !active
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-muted",
  ].join(" ");
}

export function SpeakingHubView({
  variant = "marketplace",
}: {
  variant?: "marketplace" | "centre";
}) {
  const { hub, hubLoading, hubError, refreshHub } = useTeacherSpeaking();
  const [tab, setTab] = useState<SpeakingTab>("today");
  const [tabInitialized, setTabInitialized] = useState(false);
  const isCentre = variant === "centre";

  useEffect(() => {
    void refreshHub();
  }, [refreshHub]);

  // Prefer the backlog tab when there is ungraded work and nothing on today's schedule.
  useEffect(() => {
    if (tabInitialized || hubLoading) return;
    if (hub.counts.awaitingGrade > 0 && hub.counts.today === 0) {
      setTab("awaiting");
    }
    setTabInitialized(true);
  }, [
    tabInitialized,
    hubLoading,
    hub.counts.awaitingGrade,
    hub.counts.today,
  ]);

  if (hubLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (hubError) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
          <p className="font-semibold">Failed to load speaking sessions</p>
          <p className="mt-1">{hubError}</p>
        </div>
      </div>
    );
  }

  const showNextHero =
    (tab === "today" || tab === "awaiting") &&
    hub.nextSession &&
    (hub.nextSession.uiStatus === "upcoming" ||
      hub.nextSession.uiStatus === "live" ||
      hub.nextSession.uiStatus === "awaiting_grade");

  const tabs: { id: SpeakingTab; label: string; count: number; emphasize?: boolean }[] =
    [
      { id: "today", label: "Today", count: hub.counts.today },
      { id: "upcoming", label: "Upcoming", count: hub.counts.upcoming },
      {
        id: "awaiting",
        label: "To grade",
        count: hub.counts.awaitingGrade,
        emphasize: hub.counts.awaitingGrade > 0,
      },
      { id: "completed", label: "Completed", count: hub.counts.completed },
    ];

  return (
    <div className="p-4 lg:p-6 xl:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              Speaking Examiner Console
            </h1>
            <p className="mt-1 text-sm text-muted">
              {isCentre
                ? "Centre-enrolled students only · IELTS Speaking Parts 1–3 · 20-minute sessions"
                : "IELTS Speaking Parts 1–3 · FC / LEX / GRA / PRON · 20-minute sessions"}
            </p>
          </div>
          {hub.minutesUntilNext != null && hub.nextSession && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-brand-red">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
              Next session starts in {hub.minutesUntilNext} min
            </span>
          )}
        </header>

        <nav className="flex flex-wrap gap-6 border-b border-border">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cnTab(item.id === tab)}
            >
              {item.label}
              <span className={cnCount(item.id === tab, item.emphasize)}>
                {item.count}
              </span>
            </button>
          ))}
        </nav>

        {tab === "today" && (
          <div className="space-y-5">
            {showNextHero && hub.nextSession && (
              <NextSessionHero
                session={hub.nextSession}
                minutesUntilNext={hub.minutesUntilNext}
              />
            )}
            <SpeakingSessionsList
              title="Today's Sessions"
              sessions={hub.today}
              emptyTitle="No sessions today"
              emptyDescription={
                hub.counts.awaitingGrade > 0
                  ? isCentre
                    ? `No sessions scheduled today, but ${hub.counts.awaitingGrade} completed session${hub.counts.awaitingGrade === 1 ? "" : "s"} still need grading — open the To grade tab.`
                    : `No sessions scheduled today, but ${hub.counts.awaitingGrade} completed session${hub.counts.awaitingGrade === 1 ? "" : "s"} still need grading — open the To grade tab.`
                  : isCentre
                    ? "When your centre's students have speaking sessions scheduled for today, they appear here with quick access to the live console."
                    : "When students book your speaking slots for today, they appear here with quick access to the live console."
              }
            />
          </div>
        )}

        {tab === "upcoming" && (
          <SpeakingUpcomingList
            sessions={hub.upcoming}
            emptyDescription={
              isCentre
                ? "Upcoming speaking sessions for your centre's enrolled students appear here once scheduled."
                : undefined
            }
          />
        )}

        {tab === "awaiting" && (
          <div className="space-y-5">
            {showNextHero &&
              hub.nextSession?.uiStatus === "awaiting_grade" && (
                <NextSessionHero
                  session={hub.nextSession}
                  minutesUntilNext={hub.minutesUntilNext}
                />
              )}
            <SpeakingSessionsList
              title="Awaiting grade"
              sessions={hub.awaitingGrade}
              showDate
              emptyTitle="No sessions waiting for a grade"
              emptyDescription={
                isCentre
                  ? "When a centre speaking session ends without a band score, it appears here — including past days — until you submit grades."
                  : "When a speaking session ends without a band score, it appears here — including past days — until you submit grades."
              }
            />
          </div>
        )}

        {tab === "completed" && (
          <SpeakingCompletedTable sessions={hub.completed} />
        )}
      </div>
    </div>
  );
}
