"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  commitTextAlternatives,
  parseTextAlternatives,
} from "@/lib/admin/content/answer-key-alternatives";
import type { AnswerKeyMap } from "@/lib/admin/content/utils";

type Props = {
  questionNumber: number;
  answerKey: AnswerKeyMap;
  onChange: (key: AnswerKeyMap) => void;
  type?: "text" | "tfng" | "yng" | "option";
  options?: string[];
  /** Allow multiple acceptable answers for text gaps (completion). Default true for type=text. */
  allowAlternatives?: boolean;
};

function TextAnswerKeyField({
  questionNumber,
  answerKey,
  onChange,
}: Pick<Props, "questionNumber" | "answerKey" | "onChange">) {
  const key = String(questionNumber);
  const alts = parseTextAlternatives(answerKey[key]);

  function update(next: string[]) {
    onChange({ ...answerKey, [key]: commitTextAlternatives(next) });
  }

  return (
    <div className="space-y-1.5">
      {alts.map((alt, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input
            value={alt}
            onChange={(e) => {
              const next = [...alts];
              next[i] = e.target.value;
              update(next);
            }}
            placeholder={i === 0 ? "Correct answer" : "Alternative answer"}
            className="h-8 flex-1 text-xs"
          />
          {alts.length > 1 ? (
            <button
              type="button"
              onClick={() => update(alts.filter((_, j) => j !== i))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted hover:bg-red-50 hover:text-red-600"
              aria-label="Remove alternative"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ))}
      {alts.length < 5 ? (
        <button
          type="button"
          onClick={() => update([...alts, ""])}
          className="flex items-center gap-1 text-[11px] font-medium text-navy/70 hover:text-navy"
        >
          <Plus className="h-3 w-3" />
          Add alternative answer
        </button>
      ) : null}
    </div>
  );
}

export function AnswerKeyField({
  questionNumber,
  answerKey,
  onChange,
  type = "text",
  options,
  allowAlternatives,
}: Props) {
  const key = String(questionNumber);
  const value = answerKey[key] ?? "";

  function set(v: string | string[]) {
    onChange({ ...answerKey, [key]: v });
  }

  if (type === "tfng") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => set(e.target.value)}
        className="h-8 rounded-md border border-border bg-white px-2 text-xs font-medium text-navy"
      >
        <option value="">—</option>
        <option value="TRUE">TRUE</option>
        <option value="FALSE">FALSE</option>
        <option value="NOT_GIVEN">NOT GIVEN</option>
      </select>
    );
  }

  if (type === "yng") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => set(e.target.value)}
        className="h-8 rounded-md border border-border bg-white px-2 text-xs font-medium text-navy"
      >
        <option value="">—</option>
        <option value="YES">YES</option>
        <option value="NO">NO</option>
        <option value="NOT_GIVEN">NOT GIVEN</option>
      </select>
    );
  }

  if (type === "option" && options) {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => set(e.target.value)}
        className="h-8 rounded-md border border-border bg-white px-2 text-xs font-medium text-navy"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  const useAlternatives = allowAlternatives ?? type === "text";
  if (useAlternatives) {
    return (
      <TextAnswerKeyField
        questionNumber={questionNumber}
        answerKey={answerKey}
        onChange={onChange}
      />
    );
  }

  return (
    <Input
      value={typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : ""}
      onChange={(e) => set(e.target.value)}
      placeholder="Correct answer"
      className="h-8 text-xs"
    />
  );
}

export function AnswerKeyMultiField({
  numbers,
  answerKey,
  onChange,
  options,
}: {
  numbers: number[];
  answerKey: AnswerKeyMap;
  onChange: (key: AnswerKeyMap) => void;
  options: string[];
}) {
  const primary = numbers[0];
  const stored = answerKey[String(primary)];
  const selected = Array.isArray(stored)
    ? stored
    : typeof stored === "string" && stored
      ? stored.split(",").map((s) => s.trim())
      : [];

  function toggle(opt: string) {
    let next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    if (next.length > 2) next = next.slice(-2);
    const updated = { ...answerKey };
    for (const n of numbers) {
      updated[String(n)] = next;
    }
    onChange(updated);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`rounded-md border px-2 py-1 text-xs font-semibold ${
            selected.includes(opt)
              ? "border-navy bg-navy text-white"
              : "border-border bg-white text-muted"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
