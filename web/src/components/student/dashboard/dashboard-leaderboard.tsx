"use client";

import Link from "next/link";
import { Loader2, Trophy } from "lucide-react";
import type {
  LeaderboardEntry,
  StudentLeaderboardResponse,
} from "@/lib/api/students";
import { STUDENT_VIEW_PATHS } from "@/lib/student/routes";
import { cn } from "@/lib/utils";

const SKILL_LETTERS: Array<[keyof LeaderboardEntry["skillBands"], string, string]> = [
  ["listening", "L", "text-sky-600"],
  ["reading", "R", "text-emerald-600"],
  ["writing", "W", "text-violet-600"],
  ["speaking", "S", "text-rose-600"],
];

function initialsOf(name: string): string {
  return name
    .replace(/^(Dr\.?|Prof\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function SkillBands({ bands }: { bands: LeaderboardEntry["skillBands"] }) {
  return (
    <div className="grid w-[5.25rem] shrink-0 grid-cols-4 gap-0.5 text-[10px] tabular-nums">
      {SKILL_LETTERS.map(([key, letter, color]) => (
        <div key={key} className="flex flex-col items-center gap-0.5">
          <span className={cn("font-bold leading-none", color)}>{letter}</span>
          <span className="font-semibold leading-none text-gray-700">
            {bands[key] > 0 ? bands[key] : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function LeaderboardRow({
  entry,
  highlight,
}: {
  entry: LeaderboardEntry;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_2.25rem_minmax(0,1fr)_5.25rem_2.75rem] items-center gap-x-2.5 rounded-xl border px-3 py-2",
        highlight
          ? "border-navy/20 bg-navy/5 ring-1 ring-navy/10"
          : "border-gray-100 bg-white",
      )}
    >
      <span className="text-sm font-bold tabular-nums text-gray-400">
        #{entry.rank}
      </span>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
        {initialsOf(entry.name)}
      </div>
      <p className="min-w-0 truncate text-sm font-semibold text-gray-900">
        {entry.name}
        {entry.country ? (
          <span className="font-normal text-gray-500"> · {entry.country}</span>
        ) : null}
      </p>
      <SkillBands bands={entry.skillBands} />
      <div className="text-right">
        <p className="text-base font-extrabold leading-none text-emerald-600">
          {entry.overallBand.toFixed(1)}
        </p>
        {entry.improvementDelta > 0 ? (
          <p className="mt-0.5 text-[10px] font-medium leading-none text-emerald-600">
            +{entry.improvementDelta}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardLeaderboard({
  data,
  loading,
}: {
  data: StudentLeaderboardResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-fit self-start items-center justify-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const top = data?.top ?? [];
  const current = data?.currentStudent;
  const showSeparate = data?.showCurrentSeparately ?? false;

  return (
    <section className="h-fit self-start rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h2 className="text-base font-bold text-gray-900">Band Heroes</h2>
      </div>

      {!data?.optedIn ? (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Opt in from your{" "}
          <Link
            href={STUDENT_VIEW_PATHS.profile}
            className="font-semibold underline underline-offset-2"
          >
            Profile
          </Link>{" "}
          to appear on the leaderboard and see your rank.
        </div>
      ) : null}

      {top.length === 0 ? (
        <p className="text-sm text-gray-500">
          Complete a mock and opt in to join the leaderboard.
        </p>
      ) : (
        <div className="space-y-2">
          {top.map((entry) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              highlight={
                !showSeparate && current != null && entry.id === current.id
              }
            />
          ))}

          {showSeparate && current ? (
            <>
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium text-gray-400">Your rank</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <LeaderboardRow entry={current} highlight />
            </>
          ) : null}
        </div>
      )}

      {data?.optedIn && current == null && top.length > 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Complete a mock with released results to earn your rank.
        </p>
      ) : null}
    </section>
  );
}
