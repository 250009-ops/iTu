"use client";

import type { QuestionGroup } from "@/lib/exam/types";
import { QUESTION_TYPE_LABELS } from "@/lib/admin/content/factories";
import { cn } from "@/lib/utils";

type Props = {
  types: QuestionGroup["type"][];
  value: QuestionGroup["type"];
  onChange: (type: QuestionGroup["type"]) => void;
  disabled?: boolean;
  accent?: "emerald" | "sky";
  className?: string;
};

export function QuestionTypeDrillTabs({
  types,
  value,
  onChange,
  disabled,
  accent = "emerald",
  className,
}: Props) {
  const activeClass =
    accent === "sky" ? "bg-sky-600 text-white" : "bg-emerald-600 text-white";

  return (
    <div className={cn("overflow-x-auto pb-1", className)}>
      <div className="flex min-w-max gap-2">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              value === type
                ? activeClass
                : "border border-slate-200 bg-white text-muted hover:bg-slate-50 hover:text-navy",
            )}
          >
            {QUESTION_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function readingDrillPracticeTitle(type: QuestionGroup["type"]): string {
  return `${QUESTION_TYPE_LABELS[type]} drill`;
}

export function listeningDrillPracticeTitle(type: QuestionGroup["type"]): string {
  return `${QUESTION_TYPE_LABELS[type]} drill`;
}
