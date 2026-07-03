"use client";

import { Check } from "lucide-react";
import { answeredCount, isAnswered } from "@/lib/exam/helpers";
import type { AnswerMap } from "@/lib/exam/types";
import type { ContrastTheme } from "@/lib/exam/contrast";
import { EXAM_FONT_STYLE } from "@/lib/exam/typography";
import { cn } from "@/lib/utils";

export interface PalettePart {
  id: string;
  label: string;
  numbers: number[];
}

interface QuestionPaletteProps {
  parts: PalettePart[];
  answers: AnswerMap;
  activePart: string;
  current: number | null;
  onSelectPart: (partId: string) => void;
  onSelectQuestion: (n: number) => void;
  onSubmit: () => void;
  submitLabel?: string;
  theme?: ContrastTheme;
}

export function QuestionPalette({
  parts,
  answers,
  activePart,
  current,
  onSelectPart,
  onSelectQuestion,
  onSubmit,
  submitLabel = "Submit section",
  theme,
}: QuestionPaletteProps) {
  const active = parts.find((p) => p.id === activePart) ?? parts[0];
  if (!active) return null;

  const inactiveParts = parts.filter((p) => p.id !== activePart);
  const bar = theme?.bar ?? "#ececec";
  const fg = theme?.fg ?? "#000000";
  const border = theme?.border ?? "#c4c4c4";
  const muted = theme?.muted ?? "#444444";
  const boxBg = theme?.bg ?? "#ffffff";

  return (
    <footer
      className="z-20 flex h-10 shrink-0 items-center gap-3 border-t px-3"
      style={{
        ...EXAM_FONT_STYLE,
        backgroundColor: bar,
        borderColor: border,
        color: fg,
      }}
    >
      <span className="shrink-0 text-[13px] font-bold">{active.label}</span>

      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {active.numbers.map((n) => {
          const isCurrent = current === n;
          const done = isAnswered(answers[n]);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelectQuestion(n)}
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center border text-[11px] font-normal transition",
                isCurrent
                  ? "border-blue-600"
                  : done
                    ? "border-slate-400"
                    : "border-slate-400 hover:border-slate-500",
              )}
              style={{
                backgroundColor: boxBg,
                color: fg,
                borderColor: isCurrent ? "#2563eb" : border,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-4">
        {inactiveParts.map((p) => {
          const count = answeredCount(answers, p.numbers);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPart(p.id)}
              className="flex shrink-0 items-center gap-1.5 text-[13px] transition hover:opacity-80"
              style={{ color: fg }}
            >
              <span className="font-bold">{p.label}</span>
              <span className="font-normal" style={{ color: muted }}>
                {count} of {p.numbers.length}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onSubmit}
          title={submitLabel}
          aria-label={submitLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center border transition hover:opacity-90"
          style={{
            borderColor: border,
            backgroundColor: theme ? bar : "#d4d4d4",
            color: fg,
          }}
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
      </div>
    </footer>
  );
}
