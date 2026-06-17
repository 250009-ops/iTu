"use client";

import { ExamSelect } from "@/components/exam/ui/exam-select";
import { QuestionNumberBadge } from "@/components/exam/ui/question-number-badge";
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
              options={sectionLabels.map((label) => ({ value: label, label }))}
              aria-label={`Select section for question ${q.n}`}
            />
          </li>
        );
      })}
    </ol>
  );
}
