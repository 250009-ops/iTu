"use client";

import { ExamSelect } from "@/components/exam/ui/exam-select";
import { QuestionNumberBadge } from "@/components/exam/ui/question-number-badge";
import type { MatchOption } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Props = {
  listTitle?: string;
  options: MatchOption[];
  questions: { n: number; prompt: string }[];
  answers: Record<number, string>;
  current: number | null;
  onAssign: (n: number, optionId: string | null) => void;
  onFocus: (n: number) => void;
};

/** Reading matching features/names — feature list + statement rows with Select dropdown. */
export function MatchingFeaturesControl({
  listTitle,
  options,
  questions,
  answers,
  current,
  onAssign,
  onFocus,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-500">
          {listTitle ?? "List of options"}
        </p>
        <ul className="space-y-1">
          {options.map((opt) => (
            <li key={opt.id} className="text-[14px] text-slate-800">
              <span className="font-bold text-navy">{opt.id}</span>
              <span className="ml-2">{opt.label.replace(/^[A-Z]\.?\s*/i, "")}</span>
            </li>
          ))}
        </ul>
      </div>

      <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {questions.map((q) => {
          const value = answers[q.n] ?? "";
          const isActive = current === q.n;
          return (
            <li
              key={q.n}
              id={`q-${q.n}`}
              className={cn(
                "scroll-mt-20 flex items-start gap-3 px-4 py-3.5 sm:items-center",
                isActive && "bg-sky-50/50",
              )}
            >
              <QuestionNumberBadge n={q.n} active={isActive} className="mt-0.5 sm:mt-0" />
              <p className="min-w-0 flex-1 text-[14px] leading-snug text-slate-800">
                {q.prompt}
              </p>
              <ExamSelect
                value={value}
                active={isActive}
                onFocus={() => onFocus(q.n)}
                onChange={(v) => {
                  onFocus(q.n);
                  onAssign(q.n, v || null);
                }}
                options={options.map((o) => ({ value: o.id, label: o.id }))}
                aria-label={`Select feature for question ${q.n}`}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
