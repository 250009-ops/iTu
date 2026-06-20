"use client";

import Link from "next/link";
import type { MappedSpeakingSessionItem } from "@/lib/api/mappers/teacher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CriteriaPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "sky" | "violet" | "emerald" | "amber";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };

  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset",
        tones[tone],
      )}
    >
      {label} {formatted}
    </span>
  );
}

export function SpeakingCompletedTable({
  sessions,
}: {
  sessions: MappedSpeakingSessionItem[];
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold text-navy">Completed Sessions</h2>
        <p className="mt-0.5 text-sm text-muted">
          Graded sessions remain visible here for reference.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="font-medium text-navy">No completed sessions yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            After you grade a speaking session, it stays here with band scores
            and criterion breakdowns.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <th className="px-5 py-3 sm:px-6">Student</th>
                <th className="px-5 py-3 sm:px-6">Date &amp; time</th>
                <th className="px-5 py-3 sm:px-6">Overall band</th>
                <th className="px-5 py-3 sm:px-6">Criteria</th>
                <th className="px-5 py-3 text-right sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          session.colors.bg,
                          session.colors.text,
                        )}
                      >
                        {session.initials}
                      </div>
                      <span className="font-semibold text-navy">
                        {session.studentName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <p className="font-medium text-navy">{session.dateLabel}</p>
                    <p className="text-xs text-muted">
                      {session.scheduledAt
                        ? new Date(session.scheduledAt).toLocaleTimeString(
                            "en-GB",
                            { hour: "2-digit", minute: "2-digit" },
                          )
                        : "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    <span className="text-2xl font-bold text-emerald-600">
                      {session.overallBand != null
                        ? session.overallBand % 1 === 0
                          ? session.overallBand.toFixed(0)
                          : session.overallBand.toFixed(1)
                        : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 sm:px-6">
                    {session.criteria ? (
                      <div className="flex flex-wrap gap-1.5">
                        <CriteriaPill
                          label="FC"
                          value={session.criteria.fc}
                          tone="sky"
                        />
                        <CriteriaPill
                          label="LEX"
                          value={session.criteria.lex}
                          tone="violet"
                        />
                        <CriteriaPill
                          label="GRA"
                          value={session.criteria.gra}
                          tone="emerald"
                        />
                        <CriteriaPill
                          label="PR"
                          value={session.criteria.pr}
                          tone="amber"
                        />
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right sm:px-6">
                    <Link href={`/teacher/speaking?session=${session.id}`}>
                      <Button variant="secondary" size="sm">
                        Review
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
