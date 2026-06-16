"use client";

import { isGap } from "@/lib/exam/types";
import type {
  AnswerMap,
  AnswerValue,
  InlineNode,
  QuestionGroup as Group,
} from "@/lib/exam/types";
import { cn } from "@/lib/utils";
import { GapInput } from "./gap-input";
import { MatchingControl } from "./matching-control";
import { MapLabeling } from "./map-labeling";

interface QuestionGroupProps {
  group: Group;
  answers: AnswerMap;
  current: number | null;
  onAnswer: (n: number, value: AnswerValue) => void;
  onFocus: (n: number) => void;
  onPasteBlocked?: () => void;
}

export function QuestionGroup({
  group,
  answers,
  current,
  onAnswer,
  onFocus,
  onPasteBlocked,
}: QuestionGroupProps) {
  return (
    <section className="scroll-mt-4" id={`group-${group.id}`}>
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="rounded-md bg-navy px-2 py-0.5 text-[12px] font-bold text-white">
            Questions {group.from}–{group.to}
          </span>
        </div>
        <p className="mt-2 text-[14px] font-semibold text-slate-800">
          {group.instruction}
        </p>
        {group.hint && (
          <p className="mt-1 text-[13px] font-medium uppercase tracking-wide text-brand-red">
            {group.hint}
          </p>
        )}
      </div>

      <GroupBody
        group={group}
        answers={answers}
        current={current}
        onAnswer={onAnswer}
        onFocus={onFocus}
        onPasteBlocked={onPasteBlocked}
      />
    </section>
  );
}

function renderInline(
  nodes: InlineNode[],
  answers: AnswerMap,
  current: number | null,
  onAnswer: (n: number, v: AnswerValue) => void,
  onFocus: (n: number) => void,
  onPasteBlocked?: () => void,
) {
  return nodes.map((node, i) => {
    if (isGap(node)) {
      const value = (answers[node.n] as string) ?? "";
      return (
        <GapInput
          key={`gap-${node.n}`}
          n={node.n}
          value={value}
          placeholder={node.placeholder}
          active={current === node.n}
          onChange={(v) => onAnswer(node.n, v)}
          onFocus={() => onFocus(node.n)}
          onPasteBlocked={onPasteBlocked}
        />
      );
    }
    return <span key={`t-${i}`}>{node}</span>;
  });
}

function GroupBody({
  group,
  answers,
  current,
  onAnswer,
  onFocus,
  onPasteBlocked,
}: QuestionGroupProps) {
  switch (group.type) {
    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "sentence_completion": {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {group.title && (
            <h4 className="mb-3 text-center text-[15px] font-bold text-navy">
              {group.title}
            </h4>
          )}
          <div className="space-y-2.5 leading-9 text-[15px] text-slate-700">
            {group.lines.map((line, i) => (
              <p key={i} className="flex flex-wrap items-center">
                {renderInline(line, answers, current, onAnswer, onFocus, onPasteBlocked)}
              </p>
            ))}
          </div>
        </div>
      );
    }

    case "table_completion": {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {group.title && (
            <div className="bg-slate-50 px-4 py-2 text-center text-[14px] font-bold text-navy">
              {group.title}
            </div>
          )}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy text-white">
                {group.columns.map((c) => (
                  <th
                    key={c}
                    className="border border-slate-300 px-3 py-2 text-left text-[13px] font-semibold"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row, ri) => (
                <tr key={ri} className="odd:bg-white even:bg-slate-50/60">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-slate-200 px-3 py-2 text-[14px] text-slate-700"
                    >
                      {renderInline(cell, answers, current, onAnswer, onFocus, onPasteBlocked)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "mcq_single": {
      return (
        <div className="space-y-4">
          {group.questions.map((q) => {
            const value = answers[q.n] as string | null;
            return (
              <div
                key={q.n}
                id={`q-${q.n}`}
                className={cn(
                  "scroll-mt-20 rounded-xl border p-4 transition",
                  current === q.n ? "border-navy bg-sky-50/40" : "border-slate-200 bg-white",
                )}
              >
                <p className="mb-3 flex gap-2 text-[15px] font-medium text-slate-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy text-[12px] font-bold text-white">
                    {q.n}
                  </span>
                  {q.prompt}
                </p>
                <div className="space-y-2 pl-8">
                  {q.options.map((opt) => {
                    const selected = value === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onFocus(q.n);
                          onAnswer(q.n, opt.id);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[14px] transition",
                          selected
                            ? "border-navy bg-navy/5 font-medium text-navy"
                            : "border-slate-200 text-slate-700 hover:border-navy hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                            selected
                              ? "border-navy bg-navy text-white"
                              : "border-slate-300 text-slate-400",
                          )}
                        >
                          {opt.id}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    case "mcq_multi": {
      const value = (answers[group.numbers[0]] as string[]) ?? [];
      const toggle = (id: string) => {
        let next: string[];
        if (value.includes(id)) {
          next = value.filter((v) => v !== id);
        } else if (value.length >= group.maxSelections) {
          next = [...value.slice(1), id];
        } else {
          next = [...value, id];
        }
        // Store the same array on every grouped number so the palette marks all.
        group.numbers.forEach((n) => onAnswer(n, next));
        onFocus(group.numbers[0]);
      };
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-1 flex gap-2 text-[15px] font-medium text-slate-800">
            <span className="flex h-6 items-center justify-center rounded-md bg-navy px-1.5 text-[12px] font-bold text-white">
              {group.numbers.join(" & ")}
            </span>
            {group.prompt}
          </p>
          <p className="mb-3 pl-1 text-[12px] font-medium text-slate-400">
            Choose {group.maxSelections} answers · {value.length}/
            {group.maxSelections} selected
          </p>
          <div className="space-y-2">
            {group.options.map((opt) => {
              const selected = value.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[14px] transition",
                    selected
                      ? "border-navy bg-navy/5 font-medium text-navy"
                      : "border-slate-200 text-slate-700 hover:border-navy hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-[11px] font-bold",
                      selected
                        ? "border-navy bg-navy text-white"
                        : "border-slate-300 text-transparent",
                    )}
                  >
                    ✓
                  </span>
                  <span className="font-semibold text-slate-500">{opt.id}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "tfng":
    case "yng": {
      const choices =
        group.type === "tfng"
          ? [
              { id: "TRUE", label: "True" },
              { id: "FALSE", label: "False" },
              { id: "NOT_GIVEN", label: "Not Given" },
            ]
          : [
              { id: "YES", label: "Yes" },
              { id: "NO", label: "No" },
              { id: "NOT_GIVEN", label: "Not Given" },
            ];
      return (
        <div className="space-y-2">
          {group.questions.map((q) => {
            const value = answers[q.n] as string | null;
            return (
              <div
                key={q.n}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-3.5 transition lg:flex-row lg:items-center lg:justify-between",
                  current === q.n ? "border-navy bg-sky-50/40" : "border-slate-200 bg-white",
                )}
              >
                <p className="flex gap-2 text-[14px] text-slate-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy text-[12px] font-bold text-white">
                    {q.n}
                  </span>
                  {q.prompt}
                </p>
                <div className="flex shrink-0 gap-1.5 pl-8 lg:pl-0">
                  {choices.map((c) => {
                    const selected = value === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onFocus(q.n);
                          onAnswer(q.n, c.id);
                        }}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition",
                          selected
                            ? "border-navy bg-navy text-white"
                            : "border-slate-200 text-slate-600 hover:border-navy hover:bg-slate-50",
                        )}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    case "matching":
    case "matching_headings": {
      const map: Record<number, string> = {};
      group.questions.forEach((q) => {
        const v = answers[q.n];
        if (typeof v === "string") map[q.n] = v;
      });
      return (
        <MatchingControl
          options={group.options}
          questions={group.questions}
          answers={map}
          current={current}
          onAssign={(n, id) => {
            onFocus(n);
            onAnswer(n, id);
          }}
          onFocus={onFocus}
        />
      );
    }

    case "map_labeling": {
      const map: Record<number, string> = {};
      group.zones.forEach((z) => {
        const v = answers[z.n];
        if (typeof v === "string") map[z.n] = v;
      });
      return (
        <MapLabeling
          group={group}
          answers={map}
          current={current}
          onAssign={(n, id) => {
            onFocus(n);
            onAnswer(n, id);
          }}
          onFocus={onFocus}
        />
      );
    }

    case "short_answer": {
      return (
        <div className="space-y-2">
          {group.questions.map((q) => {
            const value = (answers[q.n] as string) ?? "";
            return (
              <div
                key={q.n}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy text-[12px] font-bold text-white">
                  {q.n}
                </span>
                <span className="flex-1 text-[14px] text-slate-700">{q.prompt}</span>
                <input
                  type="text"
                  value={value}
                  onFocus={() => onFocus(q.n)}
                  onChange={(e) => onAnswer(q.n, e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    onPasteBlocked?.();
                  }}
                  className="w-40 rounded-md border-b-2 border-slate-300 px-2 py-1 text-[14px] text-navy outline-none focus:border-navy"
                />
              </div>
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
}
