"use client";

import { cn } from "@/lib/utils";

type Props = {
  questions: { n: number; prompt: string }[];
  sectionLabels: string[];
  answers: Record<number, string>;
  current: number | null;
  onAssign: (n: number, section: string | null) => void;
  onFocus: (n: number) => void;
};

/** Cambridge-style matching information: statement + "Select" dropdown per row. */
export function MatchingInformationControl({
  questions,
  sectionLabels,
  answers,
  current,
  onAssign,
  onFocus,
}: Props) {
  return (
    <ol className="space-y-0 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {questions.map((q) => {
        const value = answers[q.n] ?? "";
        const isActive = current === q.n;
        return (
          <li
            key={q.n}
            id={`q-${q.n}`}
            className={cn(
              "scroll-mt-20 flex items-start gap-3 px-4 py-3.5 transition sm:items-center",
              isActive && "bg-sky-50/50",
            )}
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white sm:mt-0">
              {q.n}
            </span>
            <p className="min-w-0 flex-1 text-[14px] leading-snug text-slate-800">
              {q.prompt}
            </p>
            <select
              value={value}
              onFocus={() => onFocus(q.n)}
              onChange={(e) => {
                onFocus(q.n);
                onAssign(q.n, e.target.value || null);
              }}
              className={cn(
                "h-9 w-[7.5rem] shrink-0 cursor-pointer rounded-md border bg-white px-2.5 text-[14px] text-slate-700 shadow-sm transition",
                value
                  ? "border-slate-400 font-medium text-navy"
                  : "border-slate-300 text-slate-500",
                isActive && "ring-2 ring-navy/20",
              )}
              aria-label={`Select section for question ${q.n}`}
            >
              <option value="">Select</option>
              {sectionLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </li>
        );
      })}
    </ol>
  );
}
