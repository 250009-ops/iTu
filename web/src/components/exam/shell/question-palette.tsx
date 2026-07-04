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
  /** IDP Listening: equal-width part columns; active column shows question boxes. */
  layout?: "inline" | "segmented";
}

function QuestionBoxes({
  numbers,
  answers,
  current,
  onSelectQuestion,
  fg,
  border,
}: {
  numbers: number[];
  answers: AnswerMap;
  current: number | null;
  onSelectQuestion: (n: number) => void;
  fg: string;
  border: string;
  boxBg?: string;
}) {
  return (
    <div
      className="flex min-w-0 items-end gap-1 overflow-x-auto border-t pt-1"
      style={{ borderColor: border }}
    >
      {numbers.map((n) => {
        const isCurrent = current === n;
        const done = isAnswered(answers[n]);
        return (
          <button
            key={n}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectQuestion(n);
            }}
            className={cn(
              "relative flex shrink-0 flex-col items-center px-0.5 pb-0.5 pt-0.5 text-[11px] font-normal transition",
              isCurrent
                ? "border border-[#1e3a8a] px-1"
                : "border border-transparent hover:opacity-80",
            )}
            style={{ color: fg }}
            aria-current={isCurrent ? "true" : undefined}
          >
            {done && (
              <span
                className="mb-0.5 h-1 w-4 shrink-0 rounded-sm bg-emerald-500"
                aria-hidden
              />
            )}
            <span>{n}</span>
          </button>
        );
      })}
    </div>
  );
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
  layout = "inline",
}: QuestionPaletteProps) {
  const active = parts.find((p) => p.id === activePart) ?? parts[0];
  if (!active) return null;

  const bar = theme?.bar ?? "#ececec";
  const fg = theme?.fg ?? "#000000";
  const border = theme?.border ?? "#c4c4c4";
  const muted = theme?.muted ?? "#444444";
  const boxBg = theme?.bg ?? "#ffffff";

  if (layout === "segmented") {
    return (
      <footer
        className="z-20 flex h-10 shrink-0 items-stretch border-t"
        style={{
          ...EXAM_FONT_STYLE,
          backgroundColor: bar,
          borderColor: border,
          color: fg,
        }}
      >
        <div className="flex min-w-0 flex-1">
          {parts.map((p) => {
            const isActive = p.id === activePart;
            const count = answeredCount(answers, p.numbers);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPart(p.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-1.5 border-r px-2 text-left transition",
                  isActive ? "bg-white" : "hover:bg-white/60",
                )}
                style={{
                  borderColor: border,
                  backgroundColor: isActive ? boxBg : undefined,
                  color: fg,
                }}
              >
                <span className="shrink-0 text-[12px] font-bold">{p.label}</span>
                {isActive ? (
                  <QuestionBoxes
                    numbers={p.numbers}
                    answers={answers}
                    current={current}
                    onSelectQuestion={onSelectQuestion}
                    fg={fg}
                    border={border}
                  />
                ) : (
                  <span className="truncate text-[12px] font-normal" style={{ color: muted }}>
                    {count} of {p.numbers.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          title={submitLabel}
          aria-label={submitLabel}
          className="flex w-10 shrink-0 items-center justify-center border-l transition hover:opacity-90"
          style={{
            borderColor: border,
            backgroundColor: bar,
            color: fg,
          }}
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
      </footer>
    );
  }

  const inactiveParts = parts.filter((p) => p.id !== activePart);

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

      <QuestionBoxes
        numbers={active.numbers}
        answers={answers}
        current={current}
        onSelectQuestion={onSelectQuestion}
        fg={fg}
        border={border}
      />

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
