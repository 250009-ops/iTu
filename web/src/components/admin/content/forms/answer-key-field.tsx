"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
        className="h-8 min-w-[4rem] rounded-md border border-border bg-white px-2 text-xs font-medium text-navy"
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

type LetterOption = { id: string; label: string };

/** Clickable letter buttons with option preview — clearer than a bare dropdown. */
export function AnswerKeyLetterPicker({
  questionNumber,
  answerKey,
  onChange,
  options,
}: {
  questionNumber: number;
  answerKey: AnswerKeyMap;
  onChange: (key: AnswerKeyMap) => void;
  options: LetterOption[];
}) {
  const key = String(questionNumber);
  const value = typeof answerKey[key] === "string" ? answerKey[key] : "";

  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            title={opt.label || opt.id}
            onClick={() =>
              onChange({
                ...answerKey,
                [key]: selected ? "" : opt.id,
              })
            }
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-bold transition",
              selected
                ? "border-navy bg-navy text-white"
                : "border-border bg-white text-navy hover:border-navy/40",
            )}
          >
            {opt.id}
          </button>
        );
      })}
    </div>
  );
}

export function setMcqSetAnswerKey(
  answerKey: AnswerKeyMap,
  numbers: number[],
  letters: string[],
): AnswerKeyMap {
  const from = numbers[0];
  const to = numbers[numbers.length - 1];
  if (from == null || to == null) return answerKey;

  const next = { ...answerKey };
  const setKey = `$set$${from}-${to}`;
  const sorted = [...letters].sort();

  if (sorted.length === 0) {
    delete next[setKey];
  } else {
    next[setKey] = sorted.join(",");
  }

  for (const n of numbers) {
    delete next[String(n)];
  }

  return next;
}

export function readMcqSetAnswerKey(
  answerKey: AnswerKeyMap,
  numbers: number[],
): string[] {
  const from = numbers[0];
  const to = numbers[numbers.length - 1];
  if (from == null || to == null) return [];

  const setKey = `$set$${from}-${to}`;
  const stored = answerKey[setKey];
  if (typeof stored === "string" && stored.trim()) {
    return stored.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return numbers
    .map((n) => answerKey[String(n)])
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function AnswerKeyMultiField({
  numbers,
  answerKey,
  onChange,
  options,
  maxSelections = 2,
  /** When set, writes a $set$from-to key instead of per-question keys. */
  setKeyMode = false,
}: {
  numbers: number[];
  answerKey: AnswerKeyMap;
  onChange: (key: AnswerKeyMap) => void;
  options: string[];
  maxSelections?: number;
  setKeyMode?: boolean;
}) {
  const primary = numbers[0];
  const last = numbers[numbers.length - 1];
  const setKey = primary != null && last != null ? `$set$${primary}-${last}` : "";
  const stored = setKeyMode ? answerKey[setKey] : answerKey[String(primary)];
  const selected = setKeyMode
    ? typeof stored === "string" && stored
      ? stored.split(",").map((s) => s.trim()).filter(Boolean)
      : []
    : Array.isArray(stored)
      ? stored
      : typeof stored === "string" && stored
        ? stored.split(",").map((s) => s.trim())
        : [];

  function toggle(opt: string) {
    let next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    if (next.length > maxSelections) next = next.slice(-maxSelections);

    if (setKeyMode) {
      onChange(setMcqSetAnswerKey(answerKey, numbers, next));
      return;
    }

    const updated = { ...answerKey };
    for (const n of numbers) {
      updated[String(n)] = next;
    }
    onChange(updated);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-semibold transition",
              selected.includes(opt)
                ? "border-navy bg-navy text-white"
                : "border-border bg-white text-muted hover:border-navy/30",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        {selected.length}/{maxSelections} selected
        {selected.length > 0 ? `: ${selected.join(", ")}` : ""}
      </p>
    </div>
  );
}
