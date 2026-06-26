"use client";

import { isGap } from "@/lib/exam/types";
import type {
  AnswerMap,
  AnswerValue,
  CompletionLine,
  InlineNode,
  QuestionGroup as Group,
} from "@/lib/exam/types";
import {
  isTextSpan,
  normalizeCompletionLines,
  completionLineClass,
  gapsInCompletionLines,
} from "@/lib/exam/inline-content";
import { cn } from "@/lib/utils";
import { GapInput } from "./gap-input";
import { MatchingControl } from "./matching-control";
import { MatchingHeadingsControl } from "./matching-headings-control";
import { MatchingInformationControl } from "./matching-information-control";
import { MatchingFeaturesControl } from "./matching-features-control";
import { FlowchartCompletionControl } from "./flowchart-completion-control";
import { SummaryCompletionListControl } from "./summary-completion-list-control";
import { MapLabeling } from "./map-labeling";
import { QuestionNumberBadge } from "@/components/exam/ui/question-number-badge";
import { passageSectionLabels } from "@/lib/exam/passage-sections";

interface QuestionGroupProps {
  group: Group;
  answers: AnswerMap;
  current: number | null;
  onAnswer: (n: number, value: AnswerValue) => void;
  onFocus: (n: number) => void;
  onPasteBlocked?: () => void;
  /** Passage paragraph markers for matching_information dropdowns. */
  passageParagraphs?: { marker?: string }[];
}

export function QuestionGroup({
  group,
  answers,
  current,
  onAnswer,
  onFocus,
  onPasteBlocked,
  passageParagraphs,
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
        passageParagraphs={passageParagraphs}
      />
    </section>
  );
}

function renderTextNode(node: InlineNode, key: string) {
  if (isTextSpan(node)) {
    return (
      <span
        key={key}
        className={cn(node.bold && "font-bold text-navy")}
      >
        {node.value}
      </span>
    );
  }
  if (typeof node === "string") {
    const trimmed = node.trim();
    if (!trimmed) return null;
    return <span key={key}>{node}</span>;
  }
  return null;
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
    return renderTextNode(node, `t-${i}`);
  });
}

function GroupBody({
  group,
  answers,
  current,
  onAnswer,
  onFocus,
  onPasteBlocked,
  passageParagraphs,
}: QuestionGroupProps) {
  switch (group.type) {
    case "note_completion":
    case "form_completion":
    case "summary_completion":
    case "sentence_completion": {
      const lines = normalizeCompletionLines(group.lines) as CompletionLine[];
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {group.title && (
            <h4 className="mb-3 text-center text-[15px] font-bold text-navy">
              {group.title}
            </h4>
          )}
          <div className="space-y-1">
            {lines.map((line, i) => (
              <p key={i} className={completionLineClass(line.style)}>
                {renderInline(
                  line.nodes,
                  answers,
                  current,
                  onAnswer,
                  onFocus,
                  onPasteBlocked,
                )}
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
                  <QuestionNumberBadge n={q.n} active={current === q.n} />
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
      const selectionMode = group.selectionMode ?? "shared";
      const optionIds = group.options.map((o) => o.id);

      if (selectionMode === "per_question") {
        const anyOrder = (group.answerOrdering ?? "any") === "any";
        const usedLetters = (exclude: number) => {
          if (anyOrder) return new Set<string>();
          const used = new Set<string>();
          for (const n of group.numbers) {
            if (n === exclude) continue;
            const v = answers[n];
            if (typeof v === "string" && v.trim()) used.add(v);
          }
          return used;
        };

        return (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 flex flex-wrap gap-2 text-[15px] font-medium text-slate-800">
              <span className="flex h-6 items-center justify-center rounded-md bg-navy px-1.5 text-[12px] font-bold text-white">
                {group.numbers[0]}
                {group.numbers.length > 1
                  ? `–${group.numbers[group.numbers.length - 1]}`
                  : ""}
              </span>
              {group.prompt}
            </p>
            <p className="mb-3 text-[12px] font-medium text-slate-500">
              Choose the correct letter, {optionIds[0] ?? "A"}–
              {optionIds[optionIds.length - 1] ?? "G"}. Write one letter in each box.
            </p>
            <ol className="mb-4 space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              {group.options.map((opt) => (
                <li key={opt.id} className="flex gap-2 text-[14px] text-slate-700">
                  <span className="font-bold text-slate-500">{opt.id}</span>
                  <span>{opt.label}</span>
                </li>
              ))}
            </ol>
            <div className="space-y-2">
              {group.numbers.map((n) => {
                const value = typeof answers[n] === "string" ? (answers[n] as string) : "";
                const used = usedLetters(n);
                const isActive = current === n;
                return (
                  <div
                    key={n}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 transition",
                      isActive ? "border-navy bg-sky-50" : "border-slate-200 bg-white",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white">
                      {n}
                    </span>
                    <select
                      value={value}
                      onFocus={() => onFocus(n)}
                      onChange={(e) => onAnswer(n, e.target.value)}
                      className="h-9 min-w-[6rem] rounded-md border border-slate-200 bg-white px-2 text-[14px] font-medium text-navy"
                    >
                      <option value="">—</option>
                      {group.options.map((opt) => (
                        <option
                          key={opt.id}
                          value={opt.id}
                          disabled={used.has(opt.id) && value !== opt.id}
                        >
                          {opt.id}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Statement</th>
                {choices.map((c) => (
                  <th key={c.id} className="w-24 px-2 py-2.5 text-center">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.questions.map((q) => {
                const value = answers[q.n] as string | null;
                const isActive = current === q.n;
                return (
                  <tr
                    key={q.n}
                    id={`q-${q.n}`}
                    className={cn(
                      "scroll-mt-20 border-b border-slate-100 transition last:border-0",
                      isActive && "bg-sky-50/60",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex gap-2 text-[14px] text-slate-800">
                        <QuestionNumberBadge n={q.n} active={isActive} />
                        <span className="pt-0.5">{q.prompt}</span>
                      </div>
                    </td>
                    {choices.map((c) => {
                      const selected = value === c.id;
                      return (
                        <td key={c.id} className="px-2 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              onFocus(q.n);
                              onAnswer(q.n, c.id);
                            }}
                            className={cn(
                              "mx-auto flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
                              selected
                                ? "border-navy bg-navy"
                                : "border-slate-300 bg-white hover:border-navy",
                            )}
                            aria-label={`${c.label} for question ${q.n}`}
                          >
                            {selected && (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    case "matching_headings": {
      const map: Record<number, string> = {};
      group.questions.forEach((q) => {
        const v = answers[q.n];
        if (typeof v === "string") map[q.n] = v;
      });
      return (
        <MatchingHeadingsControl
          options={group.options}
          questions={group.questions}
          answers={map}
          current={current}
          onFocus={onFocus}
        />
      );
    }

    case "matching": {
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

    case "matching_information": {
      const labels = passageSectionLabels(
        passageParagraphs,
        group.sectionLabels,
      );
      const map: Record<number, string> = {};
      group.questions.forEach((q) => {
        const v = answers[q.n];
        if (typeof v === "string") map[q.n] = v;
      });
      return (
        <MatchingInformationControl
          questions={group.questions}
          sectionLabels={labels}
          answers={map}
          current={current}
          onAssign={(n, section) => {
            onFocus(n);
            onAnswer(n, section);
          }}
          onFocus={onFocus}
        />
      );
    }

    case "matching_features": {
      const map: Record<number, string> = {};
      group.questions.forEach((q) => {
        const v = answers[q.n];
        if (typeof v === "string") map[q.n] = v;
      });
      return (
        <MatchingFeaturesControl
          listTitle={group.listTitle}
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

    case "flowchart_completion": {
      const nodes = Array.isArray(group.nodes) ? group.nodes : [];
      const map: Record<number, string> = {};
      for (const node of nodes) {
        if (node.kind === "gap") {
          const v = answers[node.n];
          if (typeof v === "string") map[node.n] = v;
        }
      }
      return (
        <FlowchartCompletionControl
          title={group.title}
          answerMode={group.answerMode}
          nodes={nodes}
          options={group.options ?? []}
          answers={map}
          current={current}
          onAssign={(n, id) => {
            onFocus(n);
            onAnswer(n, id ?? "");
          }}
          onFocus={onFocus}
          onPasteBlocked={onPasteBlocked}
        />
      );
    }

    case "summary_completion_list": {
      const map: Record<number, string> = {};
      for (const n of gapsInCompletionLines(group.lines)) {
        const v = answers[n];
        if (typeof v === "string") map[n] = v;
      }
      return (
        <SummaryCompletionListControl
          title={group.title}
          lines={group.lines}
          options={group.options}
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

    case "instruction_screen":
      return null;

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
          onAssign={(n, value) => {
            onFocus(n);
            onAnswer(n, value ?? "");
          }}
          onFocus={onFocus}
          onPasteBlocked={onPasteBlocked}
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
