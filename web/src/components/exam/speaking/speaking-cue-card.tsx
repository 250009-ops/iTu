"use client";

import { NotebookPen } from "lucide-react";
import { formatClock } from "@/lib/exam/helpers";

interface SpeakingCueCardProps {
  title: string;
  bullets: string[];
  phase: "prep" | "speak";
  remaining: number;
  prepEnded?: boolean;
}

export function SpeakingCueCard({
  title,
  bullets,
  phase,
  remaining,
  prepEnded,
}: SpeakingCueCardProps) {
  return (
    <div className="w-full max-w-md animate-fade-in rounded-2xl border border-amber-200 bg-[#fffdf5] p-6 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-amber-700">
          Part 2 · Cue card
        </span>
        <span className="flex items-center gap-1.5 text-amber-600">
          <NotebookPen size={15} />
          <span className="text-[11px] font-medium">Notes disabled</span>
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-3 text-[13px] font-semibold text-slate-500">
        You should say:
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 text-[14px] text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            {b}
          </li>
        ))}
      </ul>

      <div
        className={`mt-5 rounded-xl border p-3 text-center ${
          prepEnded
            ? "border-rose-300 bg-rose-50"
            : "border-amber-200 bg-white"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {phase === "prep" ? "Preparation time" : "Speaking time"}
        </p>
        <p
          className={`mt-0.5 text-3xl font-bold tabular-nums ${
            prepEnded ? "text-rose-700" : "text-navy"
          }`}
        >
          {formatClock(remaining)}
        </p>
        {prepEnded && (
          <p className="mt-2 text-[12px] font-semibold text-rose-700">
            Preparation ended — wait for your examiner to start Part 2.
          </p>
        )}
      </div>
    </div>
  );
}
