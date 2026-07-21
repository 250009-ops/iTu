"use client";

import { ExamSelect } from "@/components/exam/ui/exam-select";
import { QuestionNumberBadge } from "@/components/exam/ui/question-number-badge";
import { usedMatchOptionIds } from "@/lib/exam/matching-options";
import { cn } from "@/lib/utils";

type Props = {
  questions: { n: number; prompt: string }[];
  sectionLabels: string[];
  answers: Record<number, string>;
  current: number | null;
  reuseOptions?: boolean;
  onAssign: (n: number, section: string | null) => void;
  onFocus: (n: number) => void;
};

/** Cambridge-style matching information: statement + "Select" dropdown per row. */
export function MatchingInformationControl({
  questions,
  sectionLabels,
  answers,
  current,
  reuseOptions = false,
  onAssign,
  onFocus,
}: Props) {
  function assign(n: number, section: string | null) {
    if (!reuseOptions && section) {
      for (const q of questions) {
        if (q.n !== n && answers[q.n] === section) {
          onAssign(q.n, null);
        }
      }
    }
    onAssign(n, section);
  }

  return (
    <ol className="space-y-0 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {questions.map((q) => {
        const value = answers[q.n] ?? "";
        const isActive = current === q.n;
        const usedElsewhere = reuseOptions
          ? new Set<string>()
          : usedMatchOptionIds(questions, answers, q.n);
        const options = sectionLabels
          .filter((label) => !usedElsewhere.has(label) || value === label)
          .map((label) => ({ value: label, label }));

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
                assign(q.n, v || null);
              }}
              options={options}
              aria-label={`Select section for question ${q.n}`}
            />
          </li>
        );
      })}
    </ol>
  );
}
